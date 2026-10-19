-- Les jetons d'accès pour Claude sont abandonnés : on supprime ceux qui existent et la colonne qui les distinguait.
delete from devices where kind = 'jeton';
alter table devices drop column kind;
