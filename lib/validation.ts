import { z } from "zod";

export const earlyAccessSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  role: z.enum(["company", "association", "artisan", "supporter"]),
  organization: z.string().trim().max(160).optional().default(""),
  location: z.string().trim().max(120).optional().default(""),
  testingInterest: z.string().trim().min(10).max(1600),
  consent: z.literal(true),
  website: z.string().max(0).optional(), // honeypot
});

export const craftCommunitySchema = z.object({
  contactName: z.string().trim().min(2).max(120),
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(40).optional().default(""),
  organizationName: z.string().trim().max(160).optional().default(""),
  participantType: z.enum(["artisan", "cooperative", "association", "workshop", "craft_business", "community_member", "other"]),
  region: z.string().trim().min(2).max(120),
  craftTypes: z.array(z.enum(["embroidery", "weaving", "basketry", "pottery", "jewelry", "woodwork", "leather", "other"]))
    .min(1).max(8),
  aboutWork: z.string().trim().min(15).max(2000),
  websiteUrl: z.union([z.url().max(300).refine((value) => /^https?:\/\//i.test(value)), z.literal("")]).optional().default(""),
  openToCollaboration: z.boolean(),
  consent: z.literal(true),
  website: z.string().max(0).optional(), // honeypot
});

export type EarlyAccessInput = z.infer<typeof earlyAccessSchema>;
export type CraftCommunityInput = z.infer<typeof craftCommunitySchema>;
