// Decides which gallery photo the slideshow shows next.
//
// - Photos present when the slideshow starts form the pool, shown in random order: every photo
//   once per round (a shuffled "bag"), and never the same photo twice in a row.
// - Photos that appear later (new uploads, or photos published while it runs) are queued and
//   shown next, oldest first. Once shown, they join the pool.
// - Photos that are deleted or unpublished drop out straight away.

export interface Slide {
  id: string;
  imageUrl: string;
  title?: string | null;
  sharedBy?: string | null;
  createdAt?: string;
}

export class SlideshowQueue {
  private slides = new Map<string, Slide>();
  private upcoming: string[] = [];
  private bag: string[] = [];
  private lastId: string | null = null;
  private started = false;

  constructor(private random: () => number = Math.random) {}

  /** Replaces the current set of photos (call with each fresh copy of the gallery). */
  update(slides: Slide[]) {
    const fresh = slides.filter(s => !this.slides.has(s.id));
    this.slides = new Map(slides.map(s => [s.id, s]));
    this.upcoming = this.upcoming.filter(id => this.slides.has(id));
    this.bag = this.bag.filter(id => this.slides.has(id));
    if (this.started) {
      const byAge = [...fresh].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
      this.upcoming.push(...byAge.map(s => s.id));
    }
    this.started = true;
  }

  get size() {
    return this.slides.size;
  }

  /** How many new photos are waiting to be shown. */
  get queued() {
    return this.upcoming.length;
  }

  next(): Slide | null {
    const id = this.upcoming.shift() ?? this.fromBag();
    if (!id) return null;
    this.lastId = id;
    return this.slides.get(id)!;
  }

  private fromBag(): string | undefined {
    if (this.bag.length === 0) {
      this.bag = this.shuffle([...this.slides.keys()]);
      // The bag is used from the end; don't start the new round with the photo just shown.
      const last = this.bag.length - 1;
      if (last > 0 && this.bag[last] === this.lastId) [this.bag[0], this.bag[last]] = [this.bag[last], this.bag[0]];
    }
    return this.bag.pop();
  }

  private shuffle(ids: string[]) {
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids;
  }
}
