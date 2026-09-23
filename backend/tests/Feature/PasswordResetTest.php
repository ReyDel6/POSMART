<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_and_reset_password_flow(): void
    {
        $user = User::create([
            'name'    => 'Rian',
            'email'   => 'rian@t.dev',
            'password'=> 'password',
            'role'    => 'user',
        ]);

        $forgot = $this->postJson('/user/forgot-password.php', ['email' => 'rian@t.dev']);
        $forgot->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $token = $forgot->json('token');
        $this->assertNotEmpty($token);

        $reset = $this->postJson('/user/reset-password.php', [
            'email'    => 'rian@t.dev',
            'token'    => $token,
            'password' => 'rahasiaBaru9',
        ]);
        $reset->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertTrue(
            \Illuminate\Support\Facades\Hash::check('rahasiaBaru9', $user->fresh()->password)
        );

        $login = $this->postJson('/user/login.php', [
            'email'    => 'rian@t.dev',
            'password' => 'rahasiaBaru9',
        ]);
        $login->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure(['token', 'user']);
    }

    public function test_reset_with_invalid_token_fails(): void
    {
        User::create([
            'name'    => 'Rina',
            'email'   => 'rina@t.dev',
            'password'=> 'password',
            'role'    => 'user',
        ]);

        $this->postJson('/user/reset-password.php', [
            'email'    => 'rina@t.dev',
            'token'    => 'salah-token',
            'password' => 'baruBanget1',
        ])->assertStatus(422);
    }
}