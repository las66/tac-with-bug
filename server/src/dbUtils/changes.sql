ALTER TABLE users DROP COLUMN freelicense;

ALTER TABLE waitingGames ADD COLUMN bots INT ARRAY[6] NOT NULL DEFAULT '{NULL,NULL,NULL,NULL,NULL,NULL}';
ALTER TABLE games ADD COLUMN   bots INT ARRAY[6] NOT NULL DEFAULT '{NULL,NULL,NULL,NULL,NULL,NULL}';