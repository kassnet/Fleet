<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Routes d'authentification
Route::group(['prefix' => 'auth'], function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
    Route::post('logout', [AuthController::class, 'logout']);
    Route::post('refresh', [AuthController::class, 'refresh']);
    Route::get('me', [AuthController::class, 'me']);
});

// Test route
Route::get('test', function () {
    return response()->json([
        'message' => 'FacturApp API Laravel est fonctionnel !',
        'version' => '1.0.0',
        'framework' => 'Laravel 11',
        'database' => 'MySQL',
        'timestamp' => now()->toISOString()
    ]);
});