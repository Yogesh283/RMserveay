<?php

namespace App\Filament\Admin\Pages;

use Filament\Actions\Action;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Toggle;
use Filament\Notifications\Notification;
use Filament\Pages\Dashboard as BaseDashboard;
use Filament\Support\Icons\Heroicon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;
use Throwable;

class AdminDashboard extends BaseDashboard
{
    protected static bool $isDiscovered = false;

    /** Keep Filament’s default dashboard route name (`filament.admin.pages.dashboard`). */
    protected static ?string $slug = 'dashboard';

    protected function getHeaderActions(): array
    {
        return [
            Action::make('runSurveyRespondentPayouts')
                ->label('Run survey payouts')
                ->icon(Heroicon::OutlinedBanknotes)
                ->color('success')
                ->requiresConfirmation()
                ->modalHeading('Credit due survey income')
                ->modalDescription(
                    'Runs `surveys:pay-respondent-payouts` — credits member wallets for completed surveys whose '
                    .(int) config('publisher.respondent_payout_delay_days', 7).'-day delay has passed.'
                )
                ->action(function (): void {
                    try {
                        $exitCode = Artisan::call('surveys:pay-respondent-payouts');
                        $output = trim(Artisan::output());

                        if ($exitCode !== 0) {
                            Notification::make()
                                ->title('Survey payouts failed')
                                ->body(Str::limit($output !== '' ? $output : 'Non-zero exit code: '.$exitCode, 4000))
                                ->danger()
                                ->persistent()
                                ->send();

                            return;
                        }

                        Notification::make()
                            ->title('Survey payouts finished')
                            ->body(Str::limit($output !== '' ? $output : 'No payouts due.', 4000))
                            ->success()
                            ->duration(15000)
                            ->send();
                    } catch (Throwable $e) {
                        report($e);
                        Notification::make()
                            ->title('Survey payouts error')
                            ->body($e->getMessage())
                            ->danger()
                            ->persistent()
                            ->send();
                    }
                }),
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
            Action::make('reverseBinaryDailyClosing')
                ->label('Reverse closing')
                ->icon(Heroicon::OutlinedArrowUturnLeft)
                ->color('danger')
                ->modalHeading('Reverse binary daily closing')
                ->modalDescription(
                    'Undoes closing income for the chosen date: debits wallets, restores carry, deletes closing rows and wallet transactions.'
                )
                ->requiresConfirmation(fn (array $data): bool => ! ($data['dry_run'] ?? false))
                ->modalSubmitActionLabel(fn (array $data): string => ($data['dry_run'] ?? false) ? 'Preview' : 'Reverse now')
                ->schema([
                    DatePicker::make('closing_date')
                        ->label('Closing date to reverse')
                        ->default(now((string) config('binary_closing.timezone', 'Asia/Kolkata'))->subDay()->toDateString())
                        ->required()
                        ->native(false),
                    Select::make('scopes')
                        ->label('Scopes (optional)')
                        ->options([
                            'active_panel' => 'Active panel',
                            'panel' => 'Sub panel',
                            'super' => 'Super sub',
                        ])
                        ->multiple()
                        ->placeholder('All scopes'),
                    Toggle::make('dry_run')
                        ->label('Preview only (no database changes)')
                        ->default(true),
                ])
                ->action(function (array $data): void {
                    $date = $data['closing_date'] ?? null;
                    if ($date === null || $date === '') {
                        Notification::make()
                            ->title('Closing date required')
                            ->danger()
                            ->send();

                        return;
                    }

                    $params = [
                        '--date' => is_string($date) ? $date : $date->format('Y-m-d'),
                        '--no-interaction' => true,
                    ];

                    if ($data['dry_run'] ?? false) {
                        $params['--dry'] = true;
                    }

                    $scopes = array_values(array_filter((array) ($data['scopes'] ?? [])));
                    foreach ($scopes as $scope) {
                        $params['--scope'][] = $scope;
                    }

                    try {
                        $exitCode = Artisan::call('binary:reverse-closing', $params);
                        $output = trim(Artisan::output());

                        if ($exitCode !== 0) {
                            Notification::make()
                                ->title('Reverse closing failed')
                                ->body(Str::limit($output !== '' ? $output : 'Non-zero exit code: '.$exitCode, 4000))
                                ->danger()
                                ->persistent()
                                ->send();

                            return;
                        }

                        Notification::make()
                            ->title(($data['dry_run'] ?? false) ? 'Reverse preview complete' : 'Reverse closing complete')
                            ->body(Str::limit($output !== '' ? $output : 'Completed with no console output.', 4000))
                            ->success()
                            ->duration(15000)
                            ->send();
                    } catch (Throwable $e) {
                        report($e);
                        Notification::make()
                            ->title('Reverse closing error')
                            ->body($e->getMessage())
                            ->danger()
                            ->persistent()
                            ->send();
                    }
                }),
        ];
    }
}
