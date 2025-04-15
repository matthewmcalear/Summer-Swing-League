<?php
// Display all errors for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/includes/database.php';

echo "Testing PostgreSQL Connection\n\n";

try {
    $pdo = getDBConnection();
    
    // Test connection and get PostgreSQL version
    $version = $pdo->query('SELECT version()')->fetchColumn();
    echo "Connected successfully!\n";
    echo "PostgreSQL Version: " . $version . "\n\n";
    
    // Get list of tables
    $tables = $pdo->query("
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    ")->fetchAll(PDO::FETCH_COLUMN);
    
    echo "Available tables:\n";
    foreach ($tables as $table) {
        echo "- $table\n";
        
        // Get row count for each table
        $count = $pdo->query("SELECT COUNT(*) FROM $table")->fetchColumn();
        echo "  Rows: $count\n";
        
        // Get column information
        $columns = $pdo->query("
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '$table'
        ")->fetchAll(PDO::FETCH_ASSOC);
        
        echo "  Columns:\n";
        foreach ($columns as $column) {
            echo "    - {$column['column_name']} ({$column['data_type']})\n";
        }
        echo "\n";
    }
    
} catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
} 