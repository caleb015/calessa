import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Wedding settings
  await prisma.weddingSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      coupleNameA: 'Caleb',
      coupleNameB: 'Raissa',
      weddingDate: new Date('2026-12-31T17:00:00.000Z'),
      rsvpDeadline: new Date('2026-11-30T23:59:59.000Z'),
      siteTitle: 'Caleb & Raissa',
      siteDescription: 'Join us as we celebrate our wedding day.',
      heroImageUrl: '/images/hero.png',
      monogramUrl: '/images/rc-monogram-floral-green.png',
      welcomeMessage: 'We are so excited to celebrate this special day with our family and friends. Please join us!',
      isPublic: true,
      isRsvpEnabled: true,
      allowMaybe: false,
      enableMealPreference: true,
      enableSongRequest: true,
      enableGuestbook: false,
    },
  });

  // Wedding events
  await prisma.weddingEvent.createMany({
    skipDuplicates: true,
    data: [
      {
        type: 'ceremony',
        title: 'Wedding Ceremony',
        venueName: 'TBD Venue',
        address: 'TBD Address, City, Country',
        startTime: new Date('2026-12-31T17:00:00.000Z'),
        endTime: new Date('2026-12-31T18:00:00.000Z'),
        mapUrl: null,
        notes: 'Please arrive 15 minutes early.',
        displayOrder: 1,
      },
      {
        type: 'reception',
        title: 'Wedding Reception',
        venueName: 'TBD Venue',
        address: 'TBD Address, City, Country',
        startTime: new Date('2026-12-31T19:00:00.000Z'),
        endTime: new Date('2026-12-31T23:00:00.000Z'),
        mapUrl: null,
        notes: 'Cocktail hour to follow the ceremony.',
        displayOrder: 2,
      },
    ],
  });

  // Schedule
  await prisma.scheduleItem.createMany({
    skipDuplicates: true,
    data: [
      { timeLabel: '4:30 PM', title: 'Guest Arrival', description: 'Guests are welcomed and seated.', displayOrder: 1 },
      { timeLabel: '5:00 PM', title: 'Ceremony Begins', description: 'The wedding ceremony starts.', displayOrder: 2 },
      { timeLabel: '6:00 PM', title: 'Cocktail Hour', description: 'Enjoy drinks and appetizers while the couple takes photos.', displayOrder: 3 },
      { timeLabel: '7:00 PM', title: 'Reception Doors Open', description: 'Guests are invited into the reception hall.', displayOrder: 4 },
      { timeLabel: '7:30 PM', title: 'Dinner Service', description: 'Dinner is served.', displayOrder: 5 },
      { timeLabel: '8:30 PM', title: 'Program & Speeches', description: 'Toasts, first dance, and wedding program.', displayOrder: 6 },
      { timeLabel: '9:30 PM', title: 'Dancing', description: 'Dance floor opens for all guests.', displayOrder: 7 },
      { timeLabel: '11:00 PM', title: 'After-Party', description: 'Continue the celebration at the after-party venue.', displayOrder: 8 },
    ],
  });

  // FAQs
  await prisma.faqItem.createMany({
    skipDuplicates: true,
    data: [
      {
        question: 'What time should I arrive?',
        answer: 'Please arrive at least 15 minutes before the ceremony begins at 5:00 PM.',
        category: 'Logistics',
        displayOrder: 1,
      },
      {
        question: 'What should I wear?',
        answer: 'The dress code is formal/black tie optional. Please avoid wearing white or ivory.',
        category: 'Dress Code',
        displayOrder: 2,
      },
      {
        question: 'Can I bring a plus-one?',
        answer: 'Plus-ones are by invitation only. Your invitation will indicate if a guest has been allocated for you.',
        category: 'Guests',
        displayOrder: 3,
      },
      {
        question: 'Are children invited?',
        answer: 'We love your little ones! Please check your invitation to see if children have been included.',
        category: 'Guests',
        displayOrder: 4,
      },
      {
        question: 'Is there parking available?',
        answer: 'Yes, complimentary parking is available at the venue. Details will be provided closer to the date.',
        category: 'Logistics',
        displayOrder: 5,
      },
      {
        question: 'How do I RSVP?',
        answer: 'Use the RSVP link included in your invitation email. You can also visit the RSVP page and enter your invitation code.',
        category: 'RSVP',
        displayOrder: 6,
      },
      {
        question: 'Who can I contact if I have questions?',
        answer: 'Please reach out to our wedding coordinator using the details on the Contact page.',
        category: 'General',
        displayOrder: 7,
      },
    ],
  });

  // Gallery placeholder images
  await prisma.galleryImage.createMany({
    skipDuplicates: true,
    data: [
      { title: 'Engagement Photo 1', imageUrl: 'https://placehold.co/800x600', displayOrder: 1 },
      { title: 'Engagement Photo 2', imageUrl: 'https://placehold.co/800x600', displayOrder: 2 },
      { title: 'Engagement Photo 3', imageUrl: 'https://placehold.co/800x600', displayOrder: 3 },
      { title: 'Engagement Photo 4', imageUrl: 'https://placehold.co/800x600', displayOrder: 4 },
    ],
  });

  // Story timeline
  await prisma.storyTimelineItem.createMany({
    skipDuplicates: true,
    data: [
      { dateLabel: '2020', title: 'We Met', description: 'The moment that started it all.', displayOrder: 1 },
      { dateLabel: '2021', title: 'First Date', description: 'A night neither of us will ever forget.', displayOrder: 2 },
      { dateLabel: '2023', title: 'The Proposal', description: 'He got down on one knee and she said yes!', displayOrder: 3 },
      { dateLabel: '2026', title: 'The Wedding', description: 'We are getting married!', displayOrder: 4 },
    ],
  });

  // Contact persons
  await prisma.contactPerson.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Caleb Andrada', role: 'Groom', email: 'caleb@example.com', displayOrder: 1 },
      { name: 'Raissa TBD', role: 'Bride', email: 'raissa@example.com', displayOrder: 2 },
      { name: 'Wedding Coordinator', role: 'Coordinator', email: 'coordinator@example.com', phone: '+1 000 000 0000', displayOrder: 3 },
    ],
  });

  // Seating tables
  const tables = await Promise.all(
    ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Head Table'].map((name, i) =>
      prisma.seatingTable.upsert({
        where: { id: `seed-table-${i + 1}` },
        update: {},
        create: { id: `seed-table-${i + 1}`, name, capacity: name === 'Head Table' ? 10 : 8 },
      }),
    ),
  );

  // Sample guests
  const guests = await Promise.all([
    prisma.guest.upsert({
      where: { invitationCode: 'CALRAISSA01' },
      update: {},
      create: {
        primaryName: 'Juan dela Cruz',
        email: 'juan@example.com',
        group: 'Family',
        allowedPartySize: 2,
        plusOneAllowed: true,
        invitationCode: 'CALRAISSA01',
      },
    }),
    prisma.guest.upsert({
      where: { invitationCode: 'CALRAISSA02' },
      update: {},
      create: {
        primaryName: 'Maria Santos',
        email: 'maria@example.com',
        group: 'Friends',
        allowedPartySize: 1,
        plusOneAllowed: false,
        invitationCode: 'CALRAISSA02',
      },
    }),
    prisma.guest.upsert({
      where: { invitationCode: 'CALRAISSA03' },
      update: {},
      create: {
        primaryName: 'Jose Reyes',
        email: 'jose@example.com',
        group: 'Entourage',
        allowedPartySize: 2,
        plusOneAllowed: true,
        invitationCode: 'CALRAISSA03',
      },
    }),
    prisma.guest.upsert({
      where: { invitationCode: 'CALRAISSA04' },
      update: {},
      create: {
        primaryName: 'Ana Garcia',
        email: 'ana@example.com',
        group: 'Work',
        allowedPartySize: 1,
        plusOneAllowed: false,
        invitationCode: 'CALRAISSA04',
      },
    }),
  ]);

  // Sample RSVPs
  await prisma.rsvp.upsert({
    where: { guestId: guests[0].id },
    update: {},
    create: {
      guestId: guests[0].id,
      status: 'ATTENDING',
      attendeeCount: 2,
      plusOneName: 'Jane dela Cruz',
      email: 'juan@example.com',
      mealPreference: 'Chicken',
      message: 'So excited for you both!',
      songRequest: 'Can\'t Help Falling in Love',
    },
  });

  await prisma.rsvp.upsert({
    where: { guestId: guests[1].id },
    update: {},
    create: {
      guestId: guests[1].id,
      status: 'ATTENDING',
      attendeeCount: 1,
      email: 'maria@example.com',
      mealPreference: 'Fish',
      dietaryRestrictions: 'Lactose intolerant',
    },
  });

  await prisma.rsvp.upsert({
    where: { guestId: guests[3].id },
    update: {},
    create: {
      guestId: guests[3].id,
      status: 'DECLINED',
      attendeeCount: 0,
      email: 'ana@example.com',
      message: 'Sorry I can\'t make it, wishing you both all the best!',
    },
  });

  // Seating assignments for attending guests
  await prisma.seatingAssignment.upsert({
    where: { guestId: guests[0].id },
    update: {},
    create: { guestId: guests[0].id, tableId: tables[0].id },
  });

  await prisma.seatingAssignment.upsert({
    where: { guestId: guests[1].id },
    update: {},
    create: { guestId: guests[1].id, tableId: tables[1].id },
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
