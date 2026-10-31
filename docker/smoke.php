<?php

// Run inside the backend container; all HTTP requests go through Nginx.
require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

function request(string $method, string $path, int $expected, ?array $data = null, ?string $token = null, ?string $raw = null, string $contentType = 'application/json'): array
{
    $headers = "Accept: application/json\r\nContent-Type: {$contentType}\r\n";
    if ($token) {
        $headers .= "Authorization: Bearer {$token}\r\n";
    }
    $context = stream_context_create(['http' => [
        'method' => $method,
        'header' => $headers,
        'content' => $raw ?? ($data === null ? '' : json_encode($data, JSON_THROW_ON_ERROR)),
        'ignore_errors' => true,
        'timeout' => 20,
    ]]);
    $body = file_get_contents('http://frontend'.$path, false, $context);
    $status = $http_response_header[0] ?? 'No response';
    if (!str_contains($status, " {$expected} ")) {
        throw new RuntimeException("{$method} {$path}: expected {$expected}, got {$status}");
    }
    echo "PASS {$method} {$path} ({$expected})\n";
    return json_decode($body, true) ?? [];
}

$email = 'docker-smoke-'.bin2hex(random_bytes(8)).'@example.test';
$password = bin2hex(random_bytes(20));
$claimId = null;
$documentPath = null;
try {
    request('GET', '/', 200);
    request('GET', '/register', 200);
    request('GET', '/client', 200);
    request('GET', '/api/user', 401);
    $registered = request('POST', '/api/register', 201, [
        'name' => 'Docker Smoke Test', 'email' => $email, 'password' => $password,
    ]);
    $token = $registered['token'];
    request('GET', '/api/user', 200, null, $token);
    request('GET', '/api/claims', 200, null, $token);
    $claim = request('POST', '/api/claims', 201, [
        'client_name' => 'Docker Smoke Test', 'type' => 'Consultation',
        'provider_name' => 'Test Provider', 'amount' => 100,
    ], $token);
    $claimId = $claim['claim_id'];
    request('GET', '/api/claims/'.$claimId, 200, null, $token);
    $boundary = 'healthguard'.bin2hex(random_bytes(12));
    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=');
    $multipart = "--{$boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"smoke.png\"\r\nContent-Type: image/png\r\n\r\n".$png."\r\n--{$boundary}--\r\n";
    $document = request('POST', '/api/claims/'.$claimId.'/documents', 201, null, $token, $multipart, 'multipart/form-data; boundary='.$boundary);
    $documentPath = $document['file_path'];
    request('GET', '/api/claims/'.$claimId.'/documents/'.$document['id'].'/download', 200, null, $token);
    request('GET', '/storage/'.$documentPath, 404);
    request('GET', '/api/claims/'.$claimId.'/documents/'.$document['id'].'/download', 401);
    request('GET', '/api/demo-users', 404);
    request('GET', '/api/claims/unassigned', 403, null, $token);
    request('GET', '/api/claims/my-assignments', 403, null, $token);
    request('GET', '/api/notifications', 200, null, $token);
    request('POST', '/api/logout', 200, [], $token);
    request('GET', '/api/user', 401, null, $token);
    request('POST', '/api/login', 200, ['email' => $email, 'password' => $password]);
    echo "Docker HTTP smoke checks passed.\n";
} finally {
    // Remove only records created by this invocation.
    $user = App\Models\User::where('email', $email)->first();
    if ($user) {
        $user->tokens()->delete();
        if ($documentPath) {
            Illuminate\Support\Facades\Storage::disk('private')->delete($documentPath);
        }
        if ($claimId) {
            App\Models\Notification::where('claim_id', $claimId)->delete();
        }
        $user->delete();
    }
}
