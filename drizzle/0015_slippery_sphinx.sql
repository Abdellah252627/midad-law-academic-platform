ALTER TABLE `purchase_requests` ADD `price_paid` int NULL;
UPDATE `purchase_requests` AS pr
INNER JOIN `landing_products` AS lp ON lp.`productCode` = pr.`productCode`
SET pr.`price_paid` = lp.`priceMad`
WHERE pr.`price_paid` IS NULL;
ALTER TABLE `purchase_requests` MODIFY `price_paid` int NOT NULL;
