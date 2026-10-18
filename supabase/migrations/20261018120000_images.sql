-- Dossier de stockage des photos de recettes.
-- Public en lecture (les photos s'affichent sans connexion) ; l'écriture ne passe que par le serveur du site
-- (clé « service role »), qui vérifie les droits et le contenu du fichier avant d'enregistrer.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-images', 'recipe-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
