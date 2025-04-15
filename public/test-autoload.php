<?php
// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php-error.log');

try {
    require_once __DIR__ . '/../vendor/autoload.php';
    
    // Test if classes can be loaded
    $configClass = 'SSL\Config\Config';
    if (class_exists($configClass)) {
        echo "Class $configClass exists!<br>";
    } else {
        echo "Class $configClass does not exist!<br>";
    }
    
    $connectionClass = 'SSL\Database\Connection';
    if (class_exists($connectionClass)) {
        echo "Class $connectionClass exists!<br>";
    } else {
        echo "Class $connectionClass does not exist!<br>";
    }
    
    // List all loaded classes
    echo "<br>Loaded classes:<br>";
    foreach (get_declared_classes() as $class) {
        if (strpos($class, 'SSL\\') === 0) {
            echo "- $class<br>";
        }
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "<br>";
    echo "Stack trace:<br>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
} 