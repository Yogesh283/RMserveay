<?php

namespace App\Filament\Admin\Support;

use App\Models\User;
use Filament\Infolists\Components\TextEntry;
use Filament\Tables\Columns\TextColumn;

/** Shared user ID (users.id) + login UID columns for admin tables. */
final class AdminUserTableColumns
{
    public static function userDbId(string $column = 'id', string $label = 'ID'): TextColumn
    {
        return TextColumn::make($column)
            ->label($label)
            ->sortable()
            ->searchable()
            ->copyable();
    }

    public static function userLoginUid(string $column = 'login_uid', string $label = 'UID'): TextColumn
    {
        return TextColumn::make($column)
            ->label($label)
            ->badge()
            ->color('info')
            ->copyable()
            ->searchable()
            ->sortable()
            ->placeholder('—')
            ->formatStateUsing(fn ($state) => $state ? strtoupper((string) $state) : '—');
    }

    /**
     * @return list<TextColumn>
     */
    public static function identity(string $relationPrefix = ''): array
    {
        $prefix = $relationPrefix !== '' ? $relationPrefix.'.' : '';

        return [
            self::userDbId($prefix.'id'),
            self::userLoginUid($prefix.'login_uid'),
        ];
    }

    public static function infolistDbId(): TextEntry
    {
        return TextEntry::make('id')->label('ID');
    }

    public static function selectOptionLabel(User $user): string
    {
        $uid = $user->login_uid ? strtoupper((string) $user->login_uid) : '—';

        return trim($user->id.' / '.$uid.' — '.($user->name ?? ''));
    }
}
