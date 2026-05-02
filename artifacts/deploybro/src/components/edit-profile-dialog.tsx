import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUpdateMe, type ApiMe } from "@/lib/api";

const TAGLINE_MAX = 120;
const BIO_MAX = 280;
const LOCATION_MAX = 80;
const WEBSITE_MAX = 200;
const BANNER_MAX = 500;
const SKILL_MAX = 32;
const SKILLS_MAX_COUNT = 12;

function ChipList({
  label,
  placeholder,
  values,
  onChange,
  max,
  itemMax,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
  max: number;
  itemMax: number;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (v.length > itemMax) return;
    if (values.length >= max) return;
    if (values.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  };

  const remove = (idx: number) => onChange(values.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          maxLength={itemMax}
          disabled={values.length >= max}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={add}
          disabled={!draft.trim() || values.length >= max}
          aria-label={`Add ${label.toLowerCase()}`}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <span
              key={`${v}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-surface-raised border border-border pl-3 pr-1 py-1 text-xs"
            >
              {v}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${v}`}
                className="rounded-full p-0.5 text-secondary hover:text-foreground hover:bg-background"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="text-[11px] text-secondary">
        {values.length} / {max}
      </div>
    </div>
  );
}

export function EditProfileDialog({
  open,
  onOpenChange,
  me,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  me: ApiMe;
}) {
  const update = useUpdateMe();

  const [displayName, setDisplayName] = useState(me.displayName);
  const [tagline, setTagline] = useState(me.tagline);
  const [bio, setBio] = useState(me.bio);
  const [location, setLocation] = useState(me.location);
  const [websiteUrl, setWebsiteUrl] = useState(me.websiteUrl);
  const [bannerUrl, setBannerUrl] = useState(me.bannerUrl);
  const [skills, setSkills] = useState<string[]>(me.skills);

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      return;
    }
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    setDisplayName(me.displayName);
    setTagline(me.tagline);
    setBio(me.bio);
    setLocation(me.location);
    setWebsiteUrl(me.websiteUrl);
    setBannerUrl(me.bannerUrl);
    // Normalize legacy duplicates here too (case-insensitive),
    // mirroring the server-side dedupe in PATCH /me. Without this,
    // a stored `["React","react"]` would render two identical chips
    // in the editor and the user would have to remove one manually.
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const raw of me.skills) {
      const v = raw.trim();
      if (!v) continue;
      const key = v.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      cleaned.push(v);
    }
    setSkills(cleaned);
  }, [open, me]);

  const submit = () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast.error("Name is required");
      return;
    }
    update.mutate(
      {
        displayName: trimmedName,
        tagline: tagline.trim(),
        bio: bio.trim(),
        location: location.trim(),
        websiteUrl: websiteUrl.trim(),
        bannerUrl: bannerUrl.trim(),
        skills,
      },
      {
        onSuccess: () => {
          toast.success("Profile updated");
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Update failed"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            How visitors see you on your public profile page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="ep-name">Display name</Label>
            <Input
              id="ep-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
              placeholder="e.g. Alex Carter"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ep-tagline">Headline</Label>
            <Input
              id="ep-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={TAGLINE_MAX}
              placeholder="e.g. Designer building Next-Level web apps"
            />
            <div className="text-[11px] text-secondary text-right">
              {tagline.length} / {TAGLINE_MAX}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ep-bio">Bio</Label>
            <Textarea
              id="ep-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={BIO_MAX}
              rows={3}
              placeholder="A short paragraph about what you do."
            />
            <div className="text-[11px] text-secondary text-right">
              {bio.length} / {BIO_MAX}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ep-location">Location</Label>
              <Input
                id="ep-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={LOCATION_MAX}
                placeholder="London, UK"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ep-website">Website</Label>
              <Input
                id="ep-website"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                maxLength={WEBSITE_MAX}
                placeholder="alex.design"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ep-banner">Cover image URL</Label>
            <Input
              id="ep-banner"
              type="url"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              maxLength={BANNER_MAX}
              placeholder="https://images.unsplash.com/…"
            />
            {bannerUrl.trim() && (
              <div
                className="mt-2 w-full h-24 rounded-md border border-border bg-cover bg-center bg-surface-raised"
                style={{ backgroundImage: `url(${JSON.stringify(bannerUrl.trim())})` }}
                aria-label="Cover image preview"
                role="img"
              />
            )}
            <p className="text-[11px] text-secondary">
              Paste an https:// link to an image. Leave blank for the default gradient.
            </p>
          </div>

          <ChipList
            label="Skills"
            placeholder="Add a skill and press Enter"
            values={skills}
            onChange={setSkills}
            max={SKILLS_MAX_COUNT}
            itemMax={SKILL_MAX}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={update.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={update.isPending}>
            {update.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
