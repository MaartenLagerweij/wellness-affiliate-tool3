CREATE TABLE promotions (
    campaignID INT,
    wellnessName VARCHAR(100),
    title VARCHAR(200),
    url VARCHAR(500),
    oldPrice DECIMAL(8, 2),
    newPrice DECIMAL(8, 2),
    discount INT,
    image VARCHAR(250),
    location VARCHAR(100),
    id INT PRIMARY KEY
);