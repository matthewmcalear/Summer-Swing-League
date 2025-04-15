<?php
namespace SSL\Config;

class Config {
    public static function init() {
        // Initialize session if not already started
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        // Set error reporting
        error_reporting(E_ALL & ~E_NOTICE);
        ini_set('display_errors', 1);

        // Set timezone
        date_default_timezone_set('America/Toronto');

        // Load environment variables if not in production
        if (getenv('APP_ENV') !== 'production') {
            if (file_exists(__DIR__ . '/../../.env')) {
                $dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/../..');
                $dotenv->load();
            }
        }
    }
} 