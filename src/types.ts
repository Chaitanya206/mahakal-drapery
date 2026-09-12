export type Category = {
  id: string;
  code: string;
  name: string;
  slug: string;
  description: string;
  age: string;
  group_name: string;
  sort_order: number;
  active: boolean;
  updated_at: string;
};
export type Photo = {
  id?: string;
  path: string;
  alt: string;
  sort_order: number;
  url?: string;
};
export type Availability =
  | "Available"
  | "Rented"
  | "Unavailable"
  | "Coming Soon";
export type Product = {
  id: string;
  request_id?: string;
  costume_id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  category: Category;
  subcategory: string;
  price: number | null;
  price_type: "Rental" | "Purchase" | "Contact for Price";
  sizes: string[];
  colors: string[];
  tags: string[];
  availability: Availability;
  featured: boolean;
  published: boolean;
  images: Photo[];
  created_at: string;
  updated_at: string;
};
export type Settings = {
  id: boolean;
  business_name: string;
  owner_name: string;
  description: string;
  address: string;
  phones: { label: string; number: string }[];
  email: string;
  whatsapp: string;
  maps_url: string;
  social_links: { label: string; url: string }[];
  services: string[];
  hours: { days: string; time: string }[];
  updated_at: string;
};
