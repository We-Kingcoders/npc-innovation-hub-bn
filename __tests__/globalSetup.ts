// Runs exactly once, in its own process, before any Jest worker starts -
// unlike setupFilesAfterEnv's beforeAll/afterAll (which runs once per test
// FILE, in whichever parallel worker picks it up). Schema creation must
// happen here: sequelize.sync({ force: true }) drops and recreates every
// table, and running that once per file across parallel workers races
// against itself (confirmed: 5 suites/32 tests failed with createTable
// errors when this lived in setup.ts's beforeAll instead).
//
// sync() only creates tables for models that have actually been registered
// on the sequelize instance via Model.init() by the time it runs - and this
// globalSetup process is isolated from the test workers, so it never
// benefits from whatever a given test file happens to import. Running the
// full suite worked by accident (Jest's own module-resolution pass across
// many files happened to pull every model in first); running a narrower,
// filtered subset of tests did not - a test hitting an unimported model's
// table failed with a real Postgres "relation does not exist" error, not a
// test bug. Importing every model explicitly here removes that
// order-of-discovery dependency entirely.
import sequelize from '../src/config/database';
import '../src/models/alumnus.model';
import '../src/models/application.model';
import '../src/models/attendance.model';
import '../src/models/blog.model';
import '../src/models/directMessage.model';
import '../src/models/event.model';
import '../src/models/heroFeaturedMember.model';
import '../src/models/hireUsInquiry.model';
import '../src/models/hubIntroVideo.model';
import '../src/models/member.model';
import '../src/models/message.model';
import '../src/models/notification.model';
import '../src/models/project.model';
import '../src/models/resource.model';
import '../src/models/room.model';
import '../src/models/roomParticipant.model';
import '../src/models/task.model';
import '../src/models/user.model';

export default async function globalSetup(): Promise<void> {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
  await sequelize.close();
}
