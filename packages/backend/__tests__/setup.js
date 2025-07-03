require('dotenv').config({ path: '.env.test' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Global setup
beforeAll(async () => {
  // Clean up database before tests
  await prisma.$transaction([
    prisma.ticket.deleteMany(),
    prisma.ticketdetails.deleteMany(),
    prisma.supportchat.deleteMany(),
    prisma.useraction.deleteMany(),
    prisma.loginattempt.deleteMany(),
    prisma.customerreport.deleteMany(),
    prisma.orderrating.deleteMany(),
    prisma.ordertracking.deleteMany(),
    prisma.order.deleteMany(),
    prisma.reviewreaction.deleteMany(),
    prisma.review.deleteMany(),
    prisma.rating.deleteMany(),
    prisma.productview.deleteMany(),
    prisma.cartitem.deleteMany(),
    prisma.bid.deleteMany(),
    prisma.product.deleteMany(),
    prisma.wallet.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

// Global teardown
afterAll(async () => {
  await prisma.$disconnect();
});

// Reset database between tests
beforeEach(async () => {
  await prisma.$transaction([
    prisma.ticket.deleteMany(),
    prisma.ticketdetails.deleteMany(),
    prisma.supportchat.deleteMany(),
    prisma.useraction.deleteMany(),
    prisma.loginattempt.deleteMany(),
    prisma.customerreport.deleteMany(),
    prisma.orderrating.deleteMany(),
    prisma.ordertracking.deleteMany(),
    prisma.order.deleteMany(),
    prisma.reviewreaction.deleteMany(),
    prisma.review.deleteMany(),
    prisma.rating.deleteMany(),
    prisma.productview.deleteMany(),
    prisma.cartitem.deleteMany(),
    prisma.bid.deleteMany(),
    prisma.product.deleteMany(),
    prisma.wallet.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}); 