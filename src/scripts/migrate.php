<?php

require_once __DIR__ . '/../../vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../..');
$dotenv->load();

try {
    $db = \SSL\Config\Database::getInstance()->getConnection();
    
    // Create members table
    $db->exec("
        CREATE TABLE IF NOT EXISTS members (
            id SERIAL PRIMARY KEY,
            full_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            handicap DECIMAL(5,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    // Create scores table
    $db->exec("
        CREATE TABLE IF NOT EXISTS scores (
            id SERIAL PRIMARY KEY,
            player_id INTEGER REFERENCES members(id),
            course_name VARCHAR(255) NOT NULL,
            play_date DATE NOT NULL,
            score INTEGER NOT NULL,
            handicap_used DECIMAL(5,2) DEFAULT 0,
            net_score INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    // Create courses table
    $db->exec("
        CREATE TABLE IF NOT EXISTS courses (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            par INTEGER NOT NULL,
            rating DECIMAL(5,2) NOT NULL,
            slope INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    // Create trigger for updating timestamps
    $db->exec("
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    ");
    
    // Add triggers to all tables
    $tables = ['members', 'scores', 'courses'];
    foreach ($tables as $table) {
        $db->exec("
            DROP TRIGGER IF EXISTS update_{$table}_updated_at ON {$table};
            CREATE TRIGGER update_{$table}_updated_at
                BEFORE UPDATE ON {$table}
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ");
    }
    
    echo "Database tables created successfully!\n";
    
} catch (\Exception $e) {
    die("Error: " . $e->getMessage() . "\n");
} 