<?php
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config.php';

try {
    // Test database connection
    $pdo = Connection::getConnection();
    echo "Database connection successful!<br>";
    
    // Test query
    $stmt = $pdo->query("SELECT version()");
    $version = $stmt->fetch(PDO::FETCH_COLUMN);
    echo "PostgreSQL Version: " . $version . "<br>";
    
    // List all tables
    $stmt = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    echo "<br>Available tables:<br>";
    while ($row = $stmt->fetch(PDO::FETCH_COLUMN)) {
        echo "- " . $row . "<br>";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "<br>";
    echo "Connection details used:<br>";
    echo "Host: " . getenv('DB_HOST') . "<br>";
    echo "Port: " . getenv('DB_PORT') . "<br>";
    echo "Database: " . getenv('DB_NAME') . "<br>";
    echo "User: " . getenv('DB_USER') . "<br>";
    
    // Log the error
    error_log("Database connection error: " . $e->getMessage());
} 