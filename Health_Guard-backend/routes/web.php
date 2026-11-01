<?php

Route::get('/health/ready', function () {
    try {
        DB::select('SELECT 1');

        return response()->json(['status' => 'ok']);
    } catch (Throwable $e) {
        return response()->json(['status' => 'unavailable'], 503);
    }
});

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});
