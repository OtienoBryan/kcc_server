-- Create LoginHistory table for tracking user login sessions
CREATE TABLE IF NOT EXISTS LoginHistory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  sessionStart DATETIME NOT NULL,
  sessionEnd DATETIME NULL,
  ipAddress VARCHAR(45) NULL,
  userAgent TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES SalesRep(id) ON DELETE CASCADE
);

-- Add index for better performance on user queries
CREATE INDEX idx_login_history_user_id ON LoginHistory(userId);
CREATE INDEX idx_login_history_session_start ON LoginHistory(sessionStart);
CREATE INDEX idx_login_history_session_end ON LoginHistory(sessionEnd);

-- Insert some sample data for testing (optional)
INSERT INTO LoginHistory (userId, sessionStart, sessionEnd) VALUES 
(2, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY + INTERVAL 8 HOUR),
(4, NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY + INTERVAL 7 HOUR),
(5, NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 3 DAY + INTERVAL 9 HOUR)
ON DUPLICATE KEY UPDATE id=id;
