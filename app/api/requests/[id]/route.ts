import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseInitData, validate } from '@twa.js/init-data-node';

type Params = {
  params: {
    id: string;
  };
};

// TODO: factor out this functionality into a separate function and reuse for requests and announcements
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const ride = await prisma.rideRequest.findUniqueOrThrow({
      where: {
        id: Number(params.id),
      },
    });
    return NextResponse.json({
      ...ride,
      userChatId: Number(ride.userChatId),
    });
  } catch (e) {
    if ((e as any).name === 'NotFoundError') {
      return NextResponse.json({ message: 'Ride not found' }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { initData } = await req.json();

  try {
    validate(initData, process.env.BOT_TOKEN!);
  } catch {
    return NextResponse.json(
      { message: 'Invalid initData passed' },
      { status: 401 }
    );
  }

  const parsedInitData = parseInitData(initData);

  const { userChatId, id } = await prisma.rideRequest.findUniqueOrThrow({
    where: {
      id: Number(params.id),
    },
    select: {
      id: true,
      userChatId: true,
    },
  });

  if (Number(userChatId) !== parsedInitData.user?.id) {
    return NextResponse.json(
      { message: 'You can only delete your own requests' },
      { status: 403 }
    );
  }

  await prisma.rideRequest.delete({
    where: {
      id,
    },
  });

  return new NextResponse(null, { status: 204 });
}