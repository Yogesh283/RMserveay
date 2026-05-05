<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PublisherNotification extends Model
{
    protected $table = 'publisher_notifications';

    protected $fillable = [
        'user_id',
        'title',
        'body',
        'type',
        'read_at',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
