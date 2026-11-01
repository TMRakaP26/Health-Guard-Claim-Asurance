<?php
namespace App\Console\Commands;
class CreateAdmin extends CreateAnalyst
{
    protected $signature = 'healthguard:create-admin';
    protected $description = 'Create an administrator from the trusted operator terminal';
    protected string $role = 'admin';
}
