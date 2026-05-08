<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_creates_user_and_returns_json(): void
    {
        $this->withoutMiddleware(ValidateCsrfToken::class);

        $email = 'register-test-'.uniqid('', true).'@example.com';

        $response = $this->postJson('/api/register', [
            'user_type' => 'normal',
            'login_uid' => 'reg'.strtolower(substr(md5((string) microtime(true)), 0, 8)),
            'name' => 'Register Test',
            'email' => $email,
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.email', $email)
            ->assertJsonPath('user.name', 'Register Test');

        $this->assertDatabaseHas('users', [
            'email' => $email,
            'name' => 'Register Test',
        ]);
    }

    public function test_referral_register_places_inside_requested_leg_when_root_slot_is_full(): void
    {
        config(['otp.bypass' => true]);
        $this->withoutMiddleware(ValidateCsrfToken::class);

        $sponsor = User::factory()->create([
            'referral_code' => 'SPONSOR1',
        ]);
        $firstLeft = User::factory()->create([
            'sponsor_id' => $sponsor->id,
            'binary_parent_id' => $sponsor->id,
            'binary_side' => 'left',
        ]);
        $sponsor->forceFill(['left_child_id' => $firstLeft->id])->save();

        $response = $this->postJson('/api/register', [
            'user_type' => 'normal',
            'login_uid' => 'leftlegoverflow',
            'name' => 'Left Leg Overflow',
            'email' => 'left-leg-overflow@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'sponsor_referral_code' => 'SPONSOR1',
            'binary_side' => 'left',
        ]);

        $response->assertCreated();

        $newUser = User::where('login_uid', 'leftlegoverflow')->firstOrFail();
        $this->assertSame($sponsor->id, $newUser->sponsor_id);
        $this->assertSame($firstLeft->id, $newUser->binary_parent_id);
        $this->assertSame('left', $newUser->binary_side);
        $this->assertSame($newUser->id, $firstLeft->fresh()->left_child_id);
        $this->assertSame($firstLeft->id, $sponsor->fresh()->left_child_id);
    }
}
