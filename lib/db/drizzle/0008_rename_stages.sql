UPDATE "projects" SET "stage" = 'Explore', "stage_class" = 'alpha' WHERE "stage" = 'Alpha';
UPDATE "projects" SET "stage" = 'Build', "stage_class" = 'beta' WHERE "stage" = 'Beta';
UPDATE "projects" SET "stage" = 'Launch', "stage_class" = 'good' WHERE "stage" = 'Live';
