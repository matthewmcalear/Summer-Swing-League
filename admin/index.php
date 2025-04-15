<?php
require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../src/Models/Database.php';

use SSL\Models\Database;

// Initialize database connection
$db = new Database();

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['action'])) {
        switch ($_POST['action']) {
            case 'add_member':
                $data = [
                    'full_name' => $_POST['full_name'],
                    'email' => $_POST['email'],
                    'phone' => $_POST['phone'],
                    'handicap' => $_POST['handicap']
                ];
                $db->addMember($data);
                break;
                
            case 'update_settings':
                foreach ($_POST['settings'] as $key => $value) {
                    $db->updateSetting($key, $value);
                }
                break;
        }
    }
}

// Get current data
$members = $db->getMembers();
$settings = $db->getSettings();
$recentScores = $db->getRecentScores(10);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SSL Golf - Administration</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            font-family: 'Montserrat', sans-serif;
            background-color: #f8f9fa;
        }
        .navbar {
            background-color: #2c3e50;
        }
        .card {
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark mb-4">
        <div class="container">
            <a class="navbar-brand" href="../index.php">SSL Golf</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav">
                    <li class="nav-item">
                        <a class="nav-link active" href="index.php">
                            <i class="fas fa-cog"></i> Administration
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <div class="container">
        <div class="row">
            <!-- Member Management -->
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h4>Member Management</h4>
                    </div>
                    <div class="card-body">
                        <form method="POST" action="">
                            <input type="hidden" name="action" value="add_member">
                            
                            <div class="mb-3">
                                <label for="full_name" class="form-label">Full Name</label>
                                <input type="text" class="form-control" id="full_name" name="full_name" required>
                            </div>
                            
                            <div class="mb-3">
                                <label for="email" class="form-label">Email</label>
                                <input type="email" class="form-control" id="email" name="email">
                            </div>
                            
                            <div class="mb-3">
                                <label for="phone" class="form-label">Phone</label>
                                <input type="tel" class="form-control" id="phone" name="phone">
                            </div>
                            
                            <div class="mb-3">
                                <label for="handicap" class="form-label">Handicap</label>
                                <input type="number" step="0.1" class="form-control" id="handicap" name="handicap">
                            </div>
                            
                            <button type="submit" class="btn btn-primary">Add Member</button>
                        </form>
                        
                        <hr>
                        
                        <h5>Current Members</h5>
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Handicap</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($members as $member): ?>
                                        <tr>
                                            <td><?php echo htmlspecialchars($member['full_name']); ?></td>
                                            <td><?php echo htmlspecialchars($member['email']); ?></td>
                                            <td><?php echo htmlspecialchars($member['phone']); ?></td>
                                            <td><?php echo $member['handicap']; ?></td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Settings Management -->
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h4>League Settings</h4>
                    </div>
                    <div class="card-body">
                        <form method="POST" action="">
                            <input type="hidden" name="action" value="update_settings">
                            
                            <div class="mb-3">
                                <label for="league_name" class="form-label">League Name</label>
                                <input type="text" class="form-control" id="league_name" name="settings[league_name]" 
                                       value="<?php echo htmlspecialchars($settings['league_name']); ?>" required>
                            </div>
                            
                            <div class="mb-3">
                                <label for="league_start_date" class="form-label">Start Date</label>
                                <input type="date" class="form-control" id="league_start_date" name="settings[league_start_date]" 
                                       value="<?php echo htmlspecialchars($settings['league_start_date']); ?>" required>
                            </div>
                            
                            <div class="mb-3">
                                <label for="league_end_date" class="form-label">End Date</label>
                                <input type="date" class="form-control" id="league_end_date" name="settings[league_end_date]" 
                                       value="<?php echo htmlspecialchars($settings['league_end_date']); ?>" required>
                            </div>
                            
                            <div class="mb-3">
                                <label for="points_per_round" class="form-label">Points per Round</label>
                                <input type="number" class="form-control" id="points_per_round" name="settings[points_per_round]" 
                                       value="<?php echo htmlspecialchars($settings['points_per_round']); ?>" required>
                            </div>
                            
                            <div class="mb-3">
                                <label for="max_rounds_per_week" class="form-label">Max Rounds per Week</label>
                                <input type="number" class="form-control" id="max_rounds_per_week" name="settings[max_rounds_per_week]" 
                                       value="<?php echo htmlspecialchars($settings['max_rounds_per_week']); ?>" required>
                            </div>
                            
                            <button type="submit" class="btn btn-primary">Update Settings</button>
                        </form>
                    </div>
                </div>
                
                <!-- Recent Scores -->
                <div class="card">
                    <div class="card-header">
                        <h4>Recent Scores</h4>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Player</th>
                                        <th>Course</th>
                                        <th>Score</th>
                                        <th>Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($recentScores as $score): ?>
                                        <tr>
                                            <td><?php echo date('M j, Y', strtotime($score['date_played'])); ?></td>
                                            <td><?php echo htmlspecialchars($score['full_name']); ?></td>
                                            <td><?php echo htmlspecialchars($score['course_name']); ?></td>
                                            <td><?php echo $score['gross_score']; ?></td>
                                            <td><?php echo number_format($score['points'], 2); ?></td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html> 