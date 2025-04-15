<?php
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/config.php';

try {
    $pdo = Connection::getConnection();
    echo "Successfully connected to the database!\n";
    
    // Test query
    $stmt = $pdo->query("SELECT version()");
    $version = $stmt->fetch(PDO::FETCH_COLUMN);
    echo "PostgreSQL Version: " . $version . "\n";
    
    // List all tables
    $stmt = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    echo "\nAvailable tables:\n";
    while ($row = $stmt->fetch(PDO::FETCH_COLUMN)) {
        echo "- " . $row . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Connection details used:\n";
    echo "Host: " . getenv('DB_HOST') . "\n";
    echo "Port: " . getenv('DB_PORT') . "\n";
    echo "Database: " . getenv('DB_NAME') . "\n";
    echo "User: " . getenv('DB_USER') . "\n";
} 