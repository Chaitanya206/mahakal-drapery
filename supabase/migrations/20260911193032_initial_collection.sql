-- Real shop information and permanent reserved IDs. No demo inventory.
begin;
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('KT4','Kids Traditional','4–10 Years','Kids Collection',1,11);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,10) n where code='KT4';
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('KW4','Kids Western','4–10 Years','Kids Collection',2,11);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,10) n where code='KW4';
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('KB15','Kids Bollywood','11–15 Years','Kids Collection',3,11);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,10) n where code='KB15';
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('KT15','Kids Traditional','11–15 Years','Kids Collection',4,11);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,10) n where code='KT15';
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('KG','Kids Garba','','Garba & Dandiya Collection',5,11);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,10) n where code='KG';
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('AG','Adult Garba','','Garba & Dandiya Collection',6,11);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,10) n where code='AG';
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('DD','Dandiya','','Garba & Dandiya Collection',7,11);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,10) n where code='DD';
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('WS','Western','16 Years & Above','16 Years & Above',8,11);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,10) n where code='WS';
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('TR','Traditional','16 Years & Above','16 Years & Above',9,11);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,10) n where code='TR';
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('BL','Bollywood','16 Years & Above','16 Years & Above',10,11);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,10) n where code='BL';
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('FD','Fancy Dress','','Special Collection',11,6);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,5) n where code='FD';
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('CC','Character Costumes','','Special Collection',12,6);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,5) n where code='CC';
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('DN','Dance Costumes','','Special Collection',13,6);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,5) n where code='DN';
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('SF','School / Annual Function','','Special Collection',14,6);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,5) n where code='SF';
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('DT','Drama / Theatre','','Special Collection',15,6);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,5) n where code='DT';
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('MY','Mythological','','Special Collection',16,6);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,5) n where code='MY';
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('HC','Historical','','Special Collection',17,6);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,5) n where code='HC';
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('FC','Festival','','Special Collection',18,6);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,5) n where code='FC';
insert into public.categories(code,name,age,group_name,sort_order,next_number) values('AJ','Accessories & Jewellery','','Special Collection',19,6);
insert into public.costume_ids(id,category_id,ordinal) select code||'-'||lpad(n::text,2,'0'),id,n from public.categories cross join generate_series(1,5) n where code='AJ';
insert into public.settings(id,business_name,owner_name,description,address,phones,email,whatsapp,maps_url,social_links,services,hours) values(true,'Mahakal Drapery','Pankaj Soni','Costume rentals for celebrations, dance and the stage.','2nd Floor, Mahakal Drapery,
New Sangvi, Krishna Chowk,
Near Bank of Baroda, Opp. Navkar Beauty Parlour,
PCMC, Pune.','[{"label": "7276959496", "number": "+917276959496"}, {"label": "7972755815", "number": "+917972755815"}]'::jsonb,'Mahakaldrepary@gmail.com','','','[]'::jsonb,array['Costume Rental','Garba & Dandiya','Dance Costumes','Fancy Dress','Drama & Character Costumes','Accessories & Props']::text[],'[]'::jsonb);
commit;

