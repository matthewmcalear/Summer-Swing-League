<?php
// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php-error.log');

try {
    require_once __DIR__ . '/../vendor/autoload.php';
    require_once __DIR__ . '/../config.php';

    // Initialize application
    use SSL\Config\Config;
    Config::init();

    // Test database connection
    $pdo = Connection::getConnection();
    error_log("Database connection successful");
    
    // Include the navigation
    include __DIR__ . '/../includes/nav.php';
    
    // Main content
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Summer Swing League</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="assets/css/style.css" rel="stylesheet">
    </head>
    <body>
        <div class="container mt-4">
            <h1>Welcome to Summer Swing League</h1>
            <p>Database connection successful!</p>
        </div>
    </body>
    </html>
    <?php
} catch (Exception $e) {
    // Log the error with stack trace
    error_log("Application error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    
    // Display a user-friendly error message
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error - Summer Swing League</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body>
        <div class="container mt-4">
            <div class="alert alert-danger">
                <h4 class="alert-heading">Oops! Something went wrong</h4>
                <p>We're experiencing some technical difficulties. Please try again later.</p>
                <?php if (getenv('APP_ENV') !== 'production'): ?>
                    <hr>
                    <p class="mb-0">Debug information: <?php echo htmlspecialchars($e->getMessage()); ?></p>
                    <pre><?php echo htmlspecialchars($e->getTraceAsString()); ?></pre>
                <?php endif; ?>
            </div>
        </div>
    </body>
    </html>
    <?php
} 