<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PublisherNotification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $items = PublisherNotification::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn ($n) => [
                '_id' => (string) $n->id,
                'id' => $n->id,
                'title' => $n->title,
                'body' => $n->body,
                'type' => $n->type,
                'read' => $n->read_at !== null,
                'createdAt' => $n->created_at->toIso8601String(),
                'meta' => $n->meta,
            ]);

        return response()->json(['notifications' => $items]);
    }

    public function markRead(Request $request, int $id)
    {
        $n = PublisherNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereKey($id)
            ->firstOrFail();

        $n->update(['read_at' => now()]);

        return response()->json(['notification' => $n]);
    }

    public function markAllRead(Request $request)
    {
        PublisherNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }
}
