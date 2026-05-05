<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RegisterLoginUidController extends Controller
{
    /**
     * Real-time availability for the chosen login User ID (stored as login_uid).
     */
    public function check(Request $request): JsonResponse
    {
        $raw = trim((string) $request->query('q', ''));
        $normalized = strtolower($raw);

        if (strlen($normalized) < 3) {
            return response()->json([
                'available' => null,
                'message' => 'Use at least 3 characters.',
                'suggestions' => [],
            ]);
        }

        if (strlen($normalized) > 24 || ! preg_match('/^[a-z0-9_-]+$/', $normalized)) {
            return response()->json([
                'available' => false,
                'message' => 'Use letters, numbers, underscore or hyphen only (3–24 characters).',
                'suggestions' => [],
            ]);
        }

        $exists = User::query()->where('login_uid', $normalized)->exists();

        $suggestions = [];
        if ($exists) {
            $base = preg_replace('/_[0-9]+$/', '', $normalized);
            if ($base === '' || strlen($base) < 2) {
                $base = $normalized;
            }

            $attempts = 0;
            while (count($suggestions) < 3 && $attempts < 40) {
                $attempts++;
                $candidate = $base.'_'.random_int(100, 9999);
                if (strlen($candidate) > 24) {
                    continue;
                }
                if (! User::query()->where('login_uid', $candidate)->exists() && ! in_array($candidate, $suggestions, true)) {
                    $suggestions[] = $candidate;
                }
            }

            while (count($suggestions) < 3 && $attempts < 80) {
                $attempts++;
                $candidate = $base.'_'.Str::lower(Str::random(4));
                if (strlen($candidate) > 24) {
                    continue;
                }
                if (! User::query()->where('login_uid', $candidate)->exists() && ! in_array($candidate, $suggestions, true)) {
                    $suggestions[] = $candidate;
                }
            }
        }

        return response()->json([
            'available' => ! $exists,
            'suggestions' => $suggestions,
        ]);
    }
}
