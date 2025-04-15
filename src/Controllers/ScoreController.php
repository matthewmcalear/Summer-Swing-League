<?php
namespace SSL\Controllers;

use SSL\Models\Database;

class ScoreController {
    private $db;
    
    public function __construct() {
        $this->db = new Database();
    }
    
    public function handleSubmission() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            return ['success' => false, 'message' => 'Invalid request method'];
        }
        
        try {
            $data = [
                'player_id' => $_POST['player_id'],
                'date_played' => $_POST['date_played'],
                'course_name' => $_POST['course_name'],
                'holes_played' => $_POST['holes_played'],
                'gross_score' => $_POST['gross_score'],
                'handicap' => $_POST['handicap'],
                'course_difficulty' => $_POST['course_difficulty'],
                'group_members' => implode(', ', $_POST['group_members'] ?? []),
                'points' => $this->calculatePoints($_POST)
            ];
            
            $success = $this->db->addScore($data);
            
            return [
                'success' => $success,
                'message' => $success ? 'Score submitted successfully!' : 'Failed to submit score'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ];
        }
    }
    
    private function calculatePoints($data) {
        $settings = $this->db->getSettings();
        $basePoints = $settings['points_per_round'] ?? 10;
        
        // Calculate points based on handicap and course difficulty
        $handicapFactor = 1 + ($data['handicap'] / 36);
        $difficultyFactor = 1 + ($data['course_difficulty'] / 72);
        
        return $basePoints * $handicapFactor * $difficultyFactor;
    }
} 