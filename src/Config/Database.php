<?php

namespace SSL\Config;

class Database {
    private static $instance = null;
    private $connection = null;

    private function __construct() {
        $host = getenv('DB_HOST') ?: 'localhost';
        $port = getenv('DB_PORT') ?: '5432';
        $dbname = getenv('DB_NAME') ?: 'ssl_golf';
        $user = getenv('DB_USER') ?: 'postgres';
        $password = getenv('DB_PASSWORD') ?: '';

        try {
            $this->connection = new \PDO(
                "pgsql:host=$host;port=$port;dbname=$dbname",
                $user,
                $password,
                [
                    \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                    \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                    \PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (\PDOException $e) {
            throw new \Exception("Database connection failed: " . $e->getMessage());
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->connection;
    }
} 