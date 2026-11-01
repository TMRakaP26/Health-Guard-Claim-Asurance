<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:50']);
        $notifications = Notification::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->orderByDesc('id')
            ->paginate(min((int) $request->get('per_page', 20), 50));

        return response()->json(array_merge($notifications->toArray(), ['data' => \App\Http\Resources\NotificationResource::collection($notifications->getCollection())->resolve()]));
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = Notification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->count();

        return response()->json(['count' => $count]);
    }

    public function stream(Request $request)
    {
        abort_unless(config('healthguard.features.realtime'), 404);
        return response()->stream(function () use ($request) {
            $until = time() + 20;
            do {
                $user = $request->user()->fresh();
                $token = $request->user()->currentAccessToken();
                if (! $user?->is_active || ! $user->tokens()->whereKey($token->id)->exists()) { break; }
                echo 'data: '.json_encode(['count' => Notification::where('user_id', $user->id)->where('is_read', false)->count()])."\n\n";
                if (ob_get_level()) { ob_flush(); } flush();
                if (connection_aborted()) { break; } sleep(3);
            } while (time() < $until);
        }, 200, ['Content-Type' => 'text/event-stream', 'Cache-Control' => 'no-store', 'X-Accel-Buffering' => 'no']);
    }

    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $notification = Notification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $notification->update(['is_read' => true]);

        return response()->json(['message' => 'Notification marked as read']);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        Notification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'All notifications marked as read']);
    }
}
