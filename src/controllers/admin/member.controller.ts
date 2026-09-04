import { Request, Response } from 'express';
import Member from '../../models/member.model';

// PATCH /api/admin/members/:id/alumni-status - body: { isAlumni: boolean }
// A toggle, not a one-way promotion: promoting an already-promoted member
// keeps their existing alumniSince (idempotent, not an error); demoting
// clears alumniSince entirely so a later re-promotion starts fresh. Never
// touches User.role, login, or anything else about the account - purely a
// display flag on the Member profile.
export const updateMemberAlumniStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isAlumni } = req.body;

    const member = await Member.findByPk(id);
    if (!member) {
      res.status(404).json({
        status: 'fail',
        message: 'Member not found',
      });
      return;
    }

    await member.update({
      isAlumni,
      alumniSince: isAlumni ? member.alumniSince ?? new Date() : null,
      updatedAt: new Date(),
    });

    res.status(200).json({
      status: 'success',
      message: isAlumni ? 'Member marked as alumni' : 'Member alumni status cleared',
      data: { member },
    });
  } catch (error) {
    console.error('Error updating member alumni status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update member alumni status',
    });
  }
};
