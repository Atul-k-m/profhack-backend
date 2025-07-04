import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  teamName: {
    type: String,
    required: true
  },
  trackId: {
    type: String,
    required: true,
    enum: [
      'smart-campus',
      'ai-social-impact', 
      'edtech',
      'healthcare',
      'industry-4',
      'greentech',
      'disaster-management',
      'assistive-tech',
      'smart-cities',
      'open-innovation'
    ]
  },
  trackName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submittedByName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['submitted', 'under-review', 'approved', 'rejected'],
    default: 'submitted'
  },
  submissionDate: {
    type: Date,
    default: Date.now
  },
  // Additional fields for future use
  files: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  reviewNotes: {
    type: String,
    trim: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better performance
submissionSchema.index({ teamId: 1 });
submissionSchema.index({ trackId: 1 });
submissionSchema.index({ submittedBy: 1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ submissionDate: -1 });

// Pre-save middleware to populate team and track names
submissionSchema.pre('save', async function(next) {
  try {
    // Get track name from trackId
    const trackMap = {
      'smart-campus': 'Smart & Sustainable Campus',
      'ai-social-impact': 'AI & Data Science for Social Impact',
      'edtech': 'Future of Engineering Education (EdTech)',
      'healthcare': 'Healthcare Engineering',
      'industry-4': 'Industry 4.0 & Automation',
      'greentech': 'Climate Resilience & GreenTech',
      'disaster-management': 'Disaster Management & Infrastructure',
      'assistive-tech': 'Assistive Technologies for Disabilities',
      'smart-cities': 'Smart Cities & Urban Mobility',
      'open-innovation': 'Open Innovation'
    };

    if (this.trackId && !this.trackName) {
      this.trackName = trackMap[this.trackId];
    }

    // Get team name if not provided
    if (this.teamId && !this.teamName) {
      const Team = mongoose.model('Team');
      const team = await Team.findById(this.teamId).select('teamName');
      if (team) {
        this.teamName = team.teamName;
      }
    }

    // Get submitted by name if not provided
    if (this.submittedBy && !this.submittedByName) {
      const User = mongoose.model('User');
      const user = await User.findById(this.submittedBy).select('name');
      if (user) {
        this.submittedByName = user.name;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Static method to get submission statistics
submissionSchema.statics.getSubmissionStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$trackId',
        trackName: { $first: '$trackName' },
        count: { $sum: 1 },
        statuses: {
          $push: '$status'
        }
      }
    },
    {
      $project: {
        _id: 1,
        trackName: 1,
        count: 1,
        submitted: {
          $size: {
            $filter: {
              input: '$statuses',
              cond: { $eq: ['$$this', 'submitted'] }
            }
          }
        },
        underReview: {
          $size: {
            $filter: {
              input: '$statuses',
              cond: { $eq: ['$$this', 'under-review'] }
            }
          }
        },
        approved: {
          $size: {
            $filter: {
              input: '$statuses',
              cond: { $eq: ['$$this', 'approved'] }
            }
          }
        },
        rejected: {
          $size: {
            $filter: {
              input: '$statuses',
              cond: { $eq: ['$$this', 'rejected'] }
            }
          }
        }
      }
    }
  ]);

  return stats;
};

const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;