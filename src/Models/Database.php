<?php
namespace SSL\Models;

use PDO;
use PDOException;

class Database {
    private $pdo;
    
    public function __construct() {
        require_once __DIR__ . '/../../includes/database.php';
        $this->pdo = getDBConnection();
    }
    
    public function getMembers() {
        $stmt = $this->pdo->query("SELECT * FROM members ORDER BY full_name");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function addMember($data) {
        $sql = "INSERT INTO members (full_name, email, phone, handicap) 
                VALUES (:full_name, :email, :phone, :handicap)";
        
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($data);
    }
    
    public function updateMember($id, $data) {
        $sql = "UPDATE members 
                SET full_name = :full_name, 
                    email = :email, 
                    phone = :phone, 
                    handicap = :handicap,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id";
        
        $data['id'] = $id;
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($data);
    }
    
    public function deleteMember($id) {
        $sql = "DELETE FROM members WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }
    
    public function getStandings() {
        $stmt = $this->pdo->query("
            SELECT 
                m.full_name,
                COUNT(s.id) as rounds_played,
                COALESCE(SUM(s.points), 0) as total_points
            FROM members m
            LEFT JOIN scores s ON m.id = s.player_id
            GROUP BY m.id, m.full_name
            ORDER BY total_points DESC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function addScore($data) {
        $sql = "INSERT INTO scores (
            player_id, date_played, course_name, holes_played,
            gross_score, handicap, course_difficulty, group_members, points
        ) VALUES (
            :player_id, :date_played, :course_name, :holes_played,
            :gross_score, :handicap, :course_difficulty, :group_members, :points
        )";
        
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($data);
    }
    
    public function getSettings() {
        $stmt = $this->pdo->query("SELECT key, value FROM settings");
        $settings = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $settings[$row['key']] = $row['value'];
        }
        return $settings;
    }
    
    public function updateSetting($key, $value) {
        $sql = "UPDATE settings 
                SET value = :value, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE key = :key";
        
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute(['key' => $key, 'value' => $value]);
    }
    
    public function getRecentScores($limit = 10) {
        $stmt = $this->pdo->prepare("
            SELECT 
                s.*,
                m.full_name
            FROM scores s
            JOIN members m ON s.player_id = m.id
            ORDER BY s.date_played DESC
            LIMIT :limit
        ");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
} 