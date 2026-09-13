-- JobGateway Database Seed Data

USE jobgateway_db;

-- 1. Insert Initial Skills
INSERT INTO skills (name, category) VALUES
('JavaScript', 'Programming'),
('TypeScript', 'Programming'),
('React', 'Frontend'),
('Node.js', 'Backend'),
('Express.js', 'Backend'),
('Python', 'Programming'),
('FastAPI', 'Backend'),
('MySQL', 'Database'),
('PostgreSQL', 'Database'),
('MongoDB', 'Database'),
('Docker', 'DevOps'),
('AWS', 'Cloud'),
('Git', 'Tools'),
('REST API', 'Backend'),
('GraphQL', 'Backend'),
('Tailwind CSS', 'Frontend'),
('Next.js', 'Frontend'),
('Java', 'Programming'),
('Spring Boot', 'Backend'),
('Machine Learning', 'AI/Data');

-- 2. Insert Sample Jobs
INSERT INTO jobs (title, company, location, type, experience_level, salary_range, description, requirements, application_url, source) VALUES
('Full Stack Developer', 'TechCorp Solutions', 'San Francisco, CA (Remote)', 'Full-Time', 'Mid-Level', '$110,000 - $135,000', 
'We are looking for a passionate Full Stack Developer to build modern web applications using React, Node.js, TypeScript, and MySQL. You will work on user-facing features, API design, and database optimization.', 
'["React", "Node.js", "TypeScript", "MySQL", "REST API", "Git"]', 
'https://careers.techcorp.com/jobs/full-stack-dev', 'Internal'),

('Frontend Engineer (React / Next.js)', 'Innovate AI', 'New York, NY (Hybrid)', 'Full-Time', 'Entry-Level', '$85,000 - $105,000', 
'Join our dynamic frontend team building modern AI-driven user interfaces. You will create responsive components, optimize UI performance, and integrate REST & GraphQL APIs.', 
'["JavaScript", "TypeScript", "React", "Next.js", "Tailwind CSS", "HTML5", "CSS3"]', 
'https://innovate.ai/careers/frontend-eng', 'Internal'),

('Backend Software Engineer (Node.js & Python)', 'DataPulse Inc.', 'Austin, TX (Remote)', 'Full-Time', 'Senior', '$140,000 - $170,000', 
'DataPulse is seeking a Senior Backend Engineer to architect scalable microservices, manage PostgreSQL/MySQL databases, and build AI/NLP service integrations with Python and FastAPI.', 
'["Node.js", "Python", "FastAPI", "Express.js", "MySQL", "Docker", "AWS", "REST API"]', 
'https://datapulse.io/jobs/backend-engineer', 'Internal'),

('AI / ML Solutions Developer', 'NeuralTech Labs', 'Boston, MA (On-site)', 'Full-Time', 'Mid-Level', '$125,000 - $150,000', 
'NeuralTech is hiring an AI Solutions Developer to build NLP match engines, recommendation algorithms, and machine learning pipelines using spaCy, scikit-learn, and Python.', 
'["Python", "FastAPI", "Machine Learning", "scikit-learn", "spaCy", "REST API", "Docker"]', 
'https://neuraltech.io/careers/ml-dev', 'Internal'),

('DevOps & Cloud Engineer', 'CloudScale Technologies', 'Seattle, WA (Remote)', 'Full-Time', 'Mid-Level', '$115,000 - $140,000', 
'We need a cloud engineer to maintain automated CI/CD pipelines, containerize backend microservices with Docker, and manage AWS infrastructure.', 
'["Docker", "AWS", "Git", "Linux", "CI/CD", "Python"]', 
'https://cloudscale.com/careers/devops', 'Internal');

-- 3. Insert Sample Recruiters
INSERT INTO recruiters (company_name, name, title, email, linkedin_url, verified) VALUES
('TechCorp Solutions', 'Sarah Jenkins', 'Talent Acquisition Lead', 'sarah.jenkins@techcorp.com', 'https://linkedin.com/in/sarah-jenkins-recruiter', TRUE),
('Innovate AI', 'David Miller', 'Tech Recruiter', 'david.m@innovate.ai', 'https://linkedin.com/in/david-miller-tech', TRUE),
('DataPulse Inc.', 'Elena Rostova', 'Engineering Hiring Manager', 'elena@datapulse.io', 'https://linkedin.com/in/elena-rostova-hiring', TRUE),
('NeuralTech Labs', 'Marcus Vance', 'AI Recruitment Lead', 'marcus.vance@neuraltech.io', 'https://linkedin.com/in/marcus-vance-ai', TRUE),
('CloudScale Technologies', 'Rachel Green', 'Senior Technical Recruiter', 'rachel.g@cloudscale.com', 'https://linkedin.com/in/rachel-green-cloud', TRUE);
