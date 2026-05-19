<?php

namespace App\Filament\Admin\Pages;

use App\Models\SurveyResponse;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\View;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema as SchemaFacade;
use Illuminate\Support\Number;
use Illuminate\Support\Str;
use Throwable;
use UnitEnum;

class SystemToolsPage extends Page
{
    protected static ?string $slug = 'system-tools';

    protected static ?string $title = 'System tools';

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedCommandLine;

    protected static string|UnitEnum|null $navigationGroup = 'System';

    protected static ?int $navigationSort = 100;

    /**
     * @var list<array{kind: string, name: string, schema: ?string, engine: ?string, size: ?int, size_human: string, comment: string}>
     */
    public array $databaseTableRows = [];

    public int $surveyPayoutsDueNow = 0;

    public int $surveyPayoutsWaiting = 0;

    public function mount(): void
    {
        $this->databaseTableRows = $this->loadDatabaseTableRows();
        $this->refreshSurveyPayoutCounts();
    }

    public function refreshSurveyPayoutCounts(): void
    {
        $base = SurveyResponse::query()
            ->where('completed', true)
            ->whereNotNull('respondent_user_id')
            ->whereNotNull('respondent_payout_at')
            ->whereNull('respondent_payout_wallet_tx_id');

        $this->surveyPayoutsDueNow = (clone $base)
            ->where('respondent_payout_at', '<=', now())
            ->count();

        $this->surveyPayoutsWaiting = (clone $base)
            ->where('respondent_payout_at', '>', now())
            ->count();
    }

    public function content(Schema $schema): Schema
    {
        $tz = (string) config('binary_closing.timezone', 'Asia/Kolkata');
        $time = (string) config('binary_closing.closing_time', '08:00');
        $enabled = filter_var(config('binary_closing.enabled', true), FILTER_VALIDATE_BOOLEAN);
        $surveyDelayDays = (int) config('publisher.respondent_payout_delay_days', 7);

        return $schema
            ->components([
                Section::make('Survey respondent payouts (7-day wallet credit)')
                    ->description(
                        'After a member completes a survey, their reward is scheduled for '
                        .$surveyDelayDays.' day(s) later (`respondent_payout_at`). '
                        .'Scheduled job: `surveys:pay-respondent-payouts` runs hourly. '
                        .'Due now: '.$this->surveyPayoutsDueNow.'. '
                        .'Still waiting: '.$this->surveyPayoutsWaiting.'.'
                    )
                    ->icon(Heroicon::OutlinedBanknotes)
                    ->headerActions([
                        Action::make('runSurveyRespondentPayouts')
                            ->label('Run survey payouts now')
                            ->icon(Heroicon::OutlinedPlay)
                            ->color('success')
                            ->requiresConfirmation()
                            ->modalHeading('Credit due survey income to wallets?')
                            ->modalDescription(
                                'Runs `surveys:pay-respondent-payouts`. Only responses whose '
                                .$surveyDelayDays.'-day delay has passed and that are not yet paid will be credited. '
                                .'Currently due: '.$this->surveyPayoutsDueNow.'.'
                            )
                            ->action(function (): void {
                                try {
                                    $exitCode = Artisan::call('surveys:pay-respondent-payouts');
                                    $output = trim(Artisan::output());
                                    $this->refreshSurveyPayoutCounts();

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
                                        ->body(Str::limit($output !== '' ? $output : 'Completed.', 4000))
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
                    ])
                    ->schema([]),
                Section::make('Binary daily closing')
                    ->description(
                        'Scheduled job: `binary:daily-closing` runs daily at '.$time.' ('.$tz.'). '
                        .($enabled ? 'Closing is enabled.' : 'Closing is currently disabled (BINARY_CLOSING_ENABLED=false) — the command will exit without processing.')
                    )
                    ->icon(Heroicon::OutlinedClock)
                    ->headerActions([
                        Action::make('runBinaryDailyClosing')
                            ->label('Run closing now')
                            ->icon(Heroicon::OutlinedBolt)
                            ->color('warning')
                            ->modalHeading('Run binary daily closing')
                            ->modalDescription('Runs the same Artisan command as the daily schedule. Choose which calendar date to close in the configured timezone.')
                            ->schema([
                                Select::make('date_mode')
                                    ->label('Closing date')
                                    ->options([
                                        'yesterday' => 'Yesterday (default — matches unattended cron)',
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
                    ])
                    ->schema([]),
                Section::make('Database tables & views')
                    ->description('All base tables and views on the default application connection (name, engine, on-disk data+index size where available, comment).')
                    ->icon(Heroicon::OutlinedCircleStack)
                    ->schema([
                        View::make('filament.admin.pages.database-tables')
                            ->viewData(fn (): array => [
                                'rows' => $this->databaseTableRows,
                            ]),
                    ]),
            ]);
    }

    /**
     * @return list<array{kind: string, name: string, schema: ?string, engine: ?string, size: ?int, size_human: string, comment: string}>
     */
    private function loadDatabaseTableRows(): array
    {
        try {
            $builder = SchemaFacade::getConnection()->getSchemaBuilder();
            $out = [];

            foreach ($builder->getTables() as $t) {
                $size = isset($t['size']) ? (int) $t['size'] : null;
                $out[] = [
                    'kind' => 'table',
                    'name' => (string) ($t['name'] ?? ''),
                    'schema' => $t['schema'] ?? null,
                    'engine' => $t['engine'] ?? null,
                    'size' => $size,
                    'size_human' => $size !== null && $size > 0 ? Number::fileSize($size, 1) : ($size === 0 ? '0 B' : '—'),
                    'comment' => (string) ($t['comment'] ?? ''),
                ];
            }

            foreach ($builder->getViews() as $v) {
                $out[] = [
                    'kind' => 'view',
                    'name' => (string) ($v['name'] ?? ''),
                    'schema' => $v['schema'] ?? null,
                    'engine' => null,
                    'size' => null,
                    'size_human' => '—',
                    'comment' => '',
                ];
            }

            usort($out, fn (array $a, array $b): int => strcmp($a['name'], $b['name']));

            return $out;
        } catch (Throwable $e) {
            report($e);

            return [];
        }
    }
}
