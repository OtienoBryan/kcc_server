-- Insert sample countries
INSERT INTO countries (id, name) VALUES
(1, 'Kenya'),
(2, 'Tanzania')
ON DUPLICATE KEY UPDATE name = name;

-- Insert sample regions for Kenya (country_id = 1) and Tanzania (country_id = 2)
INSERT INTO regions (name, country_id) VALUES
('Nairobi', 1),
('Mombasa', 1),
('Kisumu', 1),
('Nakuru', 1),
('Eldoret', 1),
('Dar es Salaam', 2),
('Arusha', 2),
('Mwanza', 2),
('Dodoma', 2),
('Tanga', 2)
ON DUPLICATE KEY UPDATE name = name;

-- Insert sample routes
INSERT INTO routes (name) VALUES
('Nairobi Central'),
('Mombasa Coast'),
('Dar Central'),
('Arusha North'),
('Kisumu West'),
('Nakuru East'),
('Eldoret North'),
('Mwanza Central'),
('Dodoma Central'),
('Tanga Coast')
ON DUPLICATE KEY UPDATE name = name;

-- Insert sample sales reps (if table is empty)
INSERT INTO SalesRep (name, email, phone, country, region, route_id_update, route_name_update) VALUES
('Alice Johnson', 'alice.johnson@example.com', '+1234567890', 'Kenya', 'Nairobi', 1, 'Nairobi Central'),
('Bob Smith', 'bob.smith@example.com', '+1234567891', 'Kenya', 'Mombasa', 2, 'Mombasa Coast'),
('Carol Davis', 'carol.davis@example.com', '+1234567892', 'Tanzania', 'Dar es Salaam', 3, 'Dar Central'),
('David Wilson', 'david.wilson@example.com', '+1234567893', 'Tanzania', 'Arusha', 4, 'Arusha North')
ON DUPLICATE KEY UPDATE name = name;

-- Insert sample managers
INSERT INTO managers (name, email, phoneNumber, country, region, managerTypeId) VALUES
('John Smith', 'john.smith@example.com', '+1234567890', 'Kenya', 'Nairobi', 1),
('Jane Doe', 'jane.doe@example.com', '+1234567891', 'Kenya', 'Mombasa', 2),
('Mike Johnson', 'mike.johnson@example.com', '+1234567892', 'Tanzania', 'Dar es Salaam', 3),
('Sarah Wilson', 'sarah.wilson@example.com', '+1234567893', 'Tanzania', 'Arusha', 1)
ON DUPLICATE KEY UPDATE name = name;

-- Insert sample targets for sales reps
INSERT INTO distributors_targets (sales_rep_id, vapes_targets, pouches_targets, start_date, end_date)
SELECT id, 100, 50, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH)
FROM SalesRep 
WHERE id NOT IN (SELECT sales_rep_id FROM distributors_targets)
LIMIT 5
ON DUPLICATE KEY UPDATE vapes_targets = vapes_targets;

INSERT INTO key_account_targets (sales_rep_id, vapes_targets, pouches_targets, start_date, end_date)
SELECT id, 80, 40, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH)
FROM SalesRep 
WHERE id NOT IN (SELECT sales_rep_id FROM key_account_targets)
LIMIT 5
ON DUPLICATE KEY UPDATE vapes_targets = vapes_targets;

INSERT INTO retail_targets (sales_rep_id, vapes_targets, pouches_targets, start_date, end_date)
SELECT id, 60, 30, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH)
FROM SalesRep 
WHERE id NOT IN (SELECT sales_rep_id FROM retail_targets)
LIMIT 5
ON DUPLICATE KEY UPDATE vapes_targets = vapes_targets; 