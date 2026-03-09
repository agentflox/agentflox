export const USER_FORM_FIELDS = {
  firstName: { label: "First name", placeholder: "John" },
  lastName: { label: "Last name", placeholder: "Doe" },
  username: { label: "Username", placeholder: "johndoe" },
  avatar: { label: "Avatar URL", placeholder: "https://..." },
  bio: { label: "Bio", placeholder: "Tell others about you" },
  phone: { label: "Phone", placeholder: "+1 (555) 000-0000" },
  website: { label: "Website", placeholder: "https://yourdomain.com" },
  location: { label: "Location", placeholder: "City, Country" },
  timezone: { label: "Timezone", placeholder: "UTC" },
} as const;

export const fieldGroups = [
  { fields: ['firstName', 'lastName'], grid: true },
  { fields: ['username'] },
  { fields: ['avatar'] },
  { fields: ['bio'] },
  { fields: ['phone', 'website'], grid: true },
  { fields: ['location', 'timezone'], grid: true },
];


