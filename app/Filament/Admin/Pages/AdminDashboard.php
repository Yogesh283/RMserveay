<?php

namespace App\Filament\Admin\Pages;

use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Notifications\Notification;
use Filament\Pages\Dashboard as BaseDashboard;
use Filament\Support\Icons\Heroicon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;
use Throwable;

class AdminDashboard extends BaseDashboard
{
    protected static bool $isDiscovered = false;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('runBinaryDailyClosing')
                ->label('Run closing')
                ->icon(Heroicon::OutlinedBolt)
                ->color('warning')
                ->modalHeading('Run binary daily closing')
                ->modalDescription('Runs `binary:daily-closing` for the chosen calendar date (app timezone).')
                ->schema([
                    Select::make('date_mode')
                        ->label('Closing date')
                        ->options([
                            'yesterday' => 'Yesterday (default)',
                            'today' => 'Today',
                        ])
                        ->default('yesterday')
                        ->required(),
                ])
                ->action(function (array $data): void {
                    $params = [];
                    if (($data['date_mode'] ?? '') === 'today') {
                        $params['--date'] = 'today';
                    }

                    try {
                        $exitCode = Artisan::call('binary:daily-closing', $params);
                        $output = trim(Artisan::output());

                        if ($exitCode !== 0) {
                            Notification::make()
                                ->title('Binary daily closing failed')
                                ->body(Str::limit($output !== '' ? $output : 'Non-zero exit code: '.$exitCode, 4000))
                                ->danger()
                                ->persistent()
                                ->send();

                            return;
                        }

                        Notification::make()
                            ->title('Binary daily closing finished')
                            ->body(Str::limit($output !== '' ? $output : 'Completed with no console output.', 4000))
                            ->success()
                            ->duration(15000)
                            ->send();
                    } catch (Throwable $e) {
                        report($e);
                        Notification::make()
                            ->title('Binary daily closing error')
                            ->body($e->getMessage())
                            ->danger()
                            ->persistent()
                            ->send();
                    }
                }),
        ];
    }
}
