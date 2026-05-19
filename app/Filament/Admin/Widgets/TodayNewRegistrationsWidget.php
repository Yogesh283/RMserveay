<?php

namespace App\Filament\Admin\Widgets;

use App\Filament\Admin\Resources\Users\UserResource;
use App\Models\User;
use App\Support\BinaryClosingCalendar;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget;
use Illuminate\Database\Eloquent\Builder;

class TodayNewRegistrationsWidget extends TableWidget
{
    protected static bool $isDiscovered = false;

    protected static ?int $sort = 0;

    protected int | string | array $columnSpan = 'full';

    public function getTableHeading(): ?string
    {
        $tz = BinaryClosingCalendar::timezone();
        $date = BinaryClosingCalendar::todayDateString();
        $count = $this->getTableQuery()->count();

        return "Today new register ({$count}) · {$date} · {$tz}";
    }

    public function table(Table $table): Table
    {
        return $table
            ->query(fn (): Builder => $this->getTableQuery())
            ->columns([
                TextColumn::make('login_uid')
                    ->label('User ID')
                    ->badge()
                    ->color('info')
                    ->searchable()
                    ->formatStateUsing(fn ($state) => $state ? strtoupper((string) $state) : '—'),
                TextColumn::make('name')
                    ->label('Name')
                    ->searchable()
                    ->weight('semibold'),
                TextColumn::make('email')
                    ->label('Email')
                    ->copyable()
                    ->searchable(),
                TextColumn::make('phone')
                    ->label('Mobile')
                    ->placeholder('—')
                    ->toggleable(),
                TextColumn::make('user_type')
                    ->label('Type')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => match ($state) {
                        'publisher' => 'Publisher',
                        'normal' => 'Panelist',
                        default => $state ?? '—',
                    })
                    ->color(fn (?string $state): string => match ($state) {
                        'publisher' => 'warning',
                        'normal' => 'success',
                        default => 'gray',
                    }),
                TextColumn::make('sponsor.login_uid')
                    ->label('Sponsor')
                    ->placeholder('—')
                    ->formatStateUsing(fn ($state) => $state ? strtoupper((string) $state) : '—')
                    ->toggleable(),
                TextColumn::make('created_at')
                    ->label('Registered at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->emptyStateHeading('No new registrations today')
            ->emptyStateDescription('New panelist and publisher sign-ups for today will appear here.')
            ->paginated([10, 25, 50])
            ->recordUrl(fn (User $record): string => UserResource::getUrl('view', ['record' => $record]));
    }

    protected function getTableQuery(): Builder
    {
        [$todayStart, $todayEnd] = BinaryClosingCalendar::todayLocalBounds();

        return User::query()
            ->with('sponsor:id,login_uid')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->orderByDesc('created_at');
    }
}
