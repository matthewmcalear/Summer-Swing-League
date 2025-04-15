<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../vendor/autoload.php';

// Try to load the class directly
var_dump(class_exists('SSL\Config\Config', true));

// Show the actual file path that composer is looking for
$reflector = new ReflectionClass('SSL\Config\Config');
echo "File path: " . $reflector->getFileName(); 