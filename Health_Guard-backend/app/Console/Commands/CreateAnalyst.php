<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CreateAnalyst extends Command
{
    protected $signature = 'healthguard:create-analyst';

    protected $description = 'Create an analyst through a trusted interactive terminal';

    public function handle(): int
    {
        $data = [
            'name' => trim((string) $this->ask('Name')),
            'email' => strtolower(trim((string) $this->ask('Email'))),
            'password' => $this->secret('Password (at least 8 characters)'),
            'password_confirmation' => $this->secret('Confirm password'),
        ];
        $validator = Validator::make($data, [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
        ]);
        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        User::create([
            'name' => $data['name'], 'email' => $data['email'],
            'password' => Hash::make($data['password']), 'role' => 'analyst',
        ]);
        $this->info('Analyst account created.');

        return self::SUCCESS;
    }
}
