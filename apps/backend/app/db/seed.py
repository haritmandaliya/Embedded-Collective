import asyncio
from datetime import datetime
from sqlalchemy.future import select
from app.db.session import SessionLocal
from app.core.security import get_password_hash
from app.models.all_models import User, Tag, Question, Answer, FeaturedSolution, Badge, Review, CommunityConfig, Comment, Vote

BADGES = [
    {"name": "Newcomer", "description": "Joined the Embedded Collective community", "tier": "bronze", "points_required": 0},
    {"name": "First Answer", "description": "Contributed your first answer to a question", "tier": "bronze", "points_required": 10},
    {"name": "Curious Mind", "description": "Asked 3 well-received questions", "tier": "bronze", "points_required": 20},
    {"name": "Helper", "description": "Provide a helpful community response", "tier": "bronze", "points_required": 30},
    {"name": "Scholar", "description": "Read and contributed to 5 topics", "tier": "bronze", "points_required": 50},
    {"name": "Stellar Question", "description": "Asked a question that achieved 10+ upvotes", "tier": "silver", "points_required": 100},
    {"name": "Epic Answer", "description": "Provided an answer with 15+ upvotes", "tier": "silver", "points_required": 150},
    {"name": "Good Citizen", "description": "Upvoted 50 helpful answers", "tier": "silver", "points_required": 200},
    {"name": "Reviewer", "description": "Approved or flagged 20 moderation items", "tier": "silver", "points_required": 250},
    {"name": "Moderator Assistant", "description": "Helped keep discussion channels clean", "tier": "silver", "points_required": 300},
    {"name": "Enlightened", "description": "First answer accepted on a complex topic", "tier": "gold", "points_required": 500},
    {"name": "Guru", "description": "Earned 10 accepted answers on core modules", "tier": "gold", "points_required": 1000},
    {"name": "Famous Question", "description": "Asked a question viewed 1000+ times", "tier": "gold", "points_required": 1500},
    {"name": "Community Leader", "description": "Achieved platinum status and top reputation", "tier": "platinum", "points_required": 3000}
]

TAGS = [
    {"name": "stm32", "slug": "stm32"},
    {"name": "esp32", "slug": "esp32"},
    {"name": "firmware", "slug": "firmware"},
    {"name": "c", "slug": "c"},
    {"name": "c++", "slug": "c-plus-plus"},
    {"name": "rtos", "slug": "rtos"},
    {"name": "freertos", "slug": "freertos"},
    {"name": "spi", "slug": "spi"},
    {"name": "i2c", "slug": "i2c"},
    {"name": "uart", "slug": "uart"},
    {"name": "embedded-linux", "slug": "embedded-linux"},
    {"name": "kernel", "slug": "kernel"},
    {"name": "drivers", "slug": "drivers"},
    {"name": "gpio", "slug": "gpio"},
    {"name": "adc", "slug": "adc"},
    {"name": "dma", "slug": "dma"},
    {"name": "pcb-design", "slug": "pcb-design"},
    {"name": "rust", "slug": "rust"},
    {"name": "bare-metal", "slug": "bare-metal"},
    {"name": "interrupts", "slug": "interrupts"},
    {"name": "lpc2129", "slug": "lpc2129"},
    {"name": "can", "slug": "can"},
    {"name": "arm7", "slug": "arm7"},
    {"name": "watchdog", "slug": "watchdog"},
    {"name": "sleepmode", "slug": "sleepmode"},
]

USERS = [
    {"username": "harit", "email": "haritmandaliya@gmail.com", "role": "super_admin", "password": "xufg mfgf vbug hsmz", "display_name": "Harit Mandaliya", "reputation": 1000},
]

from app.db.base import Base
from app.db.session import engine

from sqlalchemy import text, inspect

async def ensure_schema():
    """Add new columns on existing databases without Alembic."""
    async with engine.begin() as conn:
        def _migrate(connection):
            insp = inspect(connection)
            if insp.has_table("question"):
                cols = {c["name"] for c in insp.get_columns("question")}
                if "is_pinned" not in cols:
                    connection.execute(text("ALTER TABLE question ADD COLUMN is_pinned BOOLEAN DEFAULT 0"))
                if "is_featured" not in cols:
                    connection.execute(text("ALTER TABLE question ADD COLUMN is_featured BOOLEAN DEFAULT 0"))
                if "deleted_at" not in cols:
                    connection.execute(text("ALTER TABLE question ADD COLUMN deleted_at TIMESTAMP"))

            if insp.has_table("review"):
                review_cols = {c["name"] for c in insp.get_columns("review")}
                if "user_id" not in review_cols:
                    connection.execute(text("ALTER TABLE review ADD COLUMN user_id INTEGER REFERENCES user(id) ON DELETE SET NULL"))

        await conn.run_sync(_migrate)


async def seed():
    async with engine.begin() as conn:
        print("Ensuring database tables exist...")
        await conn.run_sync(Base.metadata.create_all)

    await ensure_schema()

    async with SessionLocal() as db:
        print("Seeding badges...")
        for b in BADGES:
            result = await db.execute(select(Badge).where(Badge.name == b["name"]))

            if not result.scalar_one_or_none():
                db.add(Badge(**b))
                
        print("Seeding tags...")
        tag_map = {}
        for t in TAGS:
            result = await db.execute(select(Tag).where(Tag.name == t["name"]))
            db_tag = result.scalar_one_or_none()
            if not db_tag:
                db_tag = Tag(**t)
                db.add(db_tag)
            tag_map[t["name"]] = db_tag

        print("Seeding community config...")
        cfg_result = await db.execute(select(CommunityConfig).limit(1))
        if not cfg_result.scalar_one_or_none():
            db.add(CommunityConfig())

        print("Seeding users...")
        # Ensure Super Admin exists
        sa_result = await db.execute(select(User).where(User.email == "haritmandaliya@gmail.com"))
        super_admin = sa_result.scalar_one_or_none()
        if not super_admin:
            super_admin = User(
                username="harit",
                email="haritmandaliya@gmail.com",
                role="super_admin",
                display_name="Harit Mandaliya",
                hashed_password=get_password_hash("xufg mfgf vbug hsmz"),
                reputation=1000,
                is_active=True,
                onboarding_done=True,
            )
            db.add(super_admin)
            await db.flush()
        else:
            super_admin.role = "super_admin"
            super_admin.username = "harit"
            super_admin.hashed_password = get_password_hash("xufg mfgf vbug hsmz")
            await db.flush()

        # Find and remove old sample/demo users, reassigning their data to the Super Admin
        sample_usernames = ["admin", "firmware_guru", "hardware_hacker", "rtos_dev"]
        su_result = await db.execute(select(User).where(User.username.in_(sample_usernames)))
        sample_users = su_result.scalars().all()
        sample_ids = [u.id for u in sample_users if u.id != super_admin.id]

        if sample_ids:
            from sqlalchemy import update, delete
            from app.models.all_models import UserBadge, Notification, SavedQuestion, Report
            await db.execute(update(Question).where(Question.author_id.in_(sample_ids)).values(author_id=super_admin.id))
            await db.execute(update(Answer).where(Answer.author_id.in_(sample_ids)).values(author_id=super_admin.id))
            await db.execute(update(Comment).where(Comment.author_id.in_(sample_ids)).values(author_id=super_admin.id))
            await db.execute(update(Vote).where(Vote.user_id.in_(sample_ids)).values(user_id=super_admin.id))
            await db.execute(update(UserBadge).where(UserBadge.user_id.in_(sample_ids)).values(user_id=super_admin.id))
            await db.execute(update(Notification).where(Notification.user_id.in_(sample_ids)).values(user_id=super_admin.id))
            await db.execute(update(SavedQuestion).where(SavedQuestion.user_id.in_(sample_ids)).values(user_id=super_admin.id))
            await db.execute(update(Report).where(Report.reporter_id.in_(sample_ids)).values(reporter_id=super_admin.id))
            
            # Delete sample users
            await db.execute(delete(User).where(User.id.in_(sample_ids)))
            await db.flush()

        user_map = {
            "admin": super_admin,
            "firmware_guru": super_admin,
            "hardware_hacker": super_admin,
            "rtos_dev": super_admin,
            "harit": super_admin
        }

        print("Seeding questions & answers...")
        # 1. ESP32 Strapping
        q1_check = await db.execute(select(Question).where(Question.title == "ESP32-S3 Boot Loop: GPIO12 Strapping Pin Conflict"))
        if not q1_check.scalar_one_or_none():
            q1 = Question(
                title="ESP32-S3 Boot Loop: GPIO12 Strapping Pin Conflict",
                slug="esp32-s3-boot-loop-gpio12-strapping-pin-conflict",
                content="My ESP32-S3 keeps entering a boot loop when powered up from an external 3.3V LDO. In the UART log I see 'waiting for download' or random resets. I suspected power rail decoupling, but 10uF + 100nF caps are placed right at the VDD pin. Could a connection on GPIO12 be affecting strapping voltages?",
                author_id=user_map["hardware_hacker"].id,
                score=5,
                views=124,
                is_solved=True,
                created_at=datetime.utcnow()
            )
            q1.tags = [tag_map["esp32"], tag_map["bare-metal"]]
            db.add(q1)
            await db.flush()

            a1 = Answer(
                content="GPIO12 (MTDI) is a strapping pin that controls the internal LDO voltage of the SPI flash (1.8V vs 3.3V). If you pull GPIO12 high during reset, it sets the flash voltage to 1.8V. If your chip uses a 3.3V flash, it fails to read the bootloader and bootloops. Add an external pull-down resistor (10k) on GPIO12 to ensure it is low at boot.",
                question_id=q1.id,
                author_id=user_map["firmware_guru"].id,
                is_accepted=True,
                score=12
            )
            db.add(a1)
            await db.flush()
            
            # Feature this solution
            f1 = FeaturedSolution()
            f1.question_id = q1.id
            f1.display_order = 1
            db.add(f1)

        # 2. I2C Pullups
        q2_check = await db.execute(select(Question).where(Question.title == "I2C Pull-Up Mismatches on STM32F4 Core"))
        if not q2_check.scalar_one_or_none():
            q2 = Question(
                title="I2C Pull-Up Mismatches on STM32F4 Core",
                slug="i2c-pull-up-mismatches-on-stm32f4-core",
                content="I have three slave devices (IMU, EEPROM, and RTC) on the same I2C bus using STM32F446. The bus is configured at 400kHz (Fast Mode). The communication fails with a BUSY flag timeout as soon as I connect the RTC. I'm using internal pull-ups (approx 40k). Is this a capacitance issue?",
                author_id=user_map["firmware_guru"].id,
                score=10,
                views=310,
                is_solved=True,
                created_at=datetime.utcnow()
            )
            q2.tags = [tag_map["stm32"], tag_map["i2c"]]
            db.add(q2)
            await db.flush()

            a2 = Answer(
                content="Internal pull-up resistors on STM32 (40k ohms) are far too weak for 400kHz operation, especially with multiple devices on the bus. The high bus capacitance combined with high resistance results in slow rise times, rounding off the digital edges and throwing off the timing. You must disable internal pull-ups and solder external resistors—2.2k or 4.7k ohms are standard. This resolves the BUSY timeout.",
                question_id=q2.id,
                author_id=user_map["hardware_hacker"].id,
                is_accepted=True,
                score=18
            )
            db.add(a2)
            await db.flush()

            f2 = FeaturedSolution()
            f2.question_id = q2.id
            f2.display_order = 2
            db.add(f2)

        # 3. DMA Alignment
        q3_check = await db.execute(select(Question).where(Question.title == "DMA Alignment Issues in FreeRTOS Ring Buffers"))
        if not q3_check.scalar_one_or_none():
            q3 = Question(
                title="DMA Alignment Issues in FreeRTOS Ring Buffers",
                slug="dma-alignment-issues-in-freertos-ring-buffers",
                content="I'm trying to stream ADC conversions via DMA into a ring buffer inside a FreeRTOS task on an STM32H7. It compiles fine, but occasionally triggers a HardFault when writing to the buffer. I suspect cache coherency or pointer memory alignment since H7 has a complex D1/D2/D3 domain architecture. Any suggestions?",
                author_id=user_map["rtos_dev"].id,
                score=8,
                views=198,
                is_solved=True,
                created_at=datetime.utcnow()
            )
            q3.tags = [tag_map["stm32"], tag_map["dma"], tag_map["rtos"]]
            db.add(q3)
            await db.flush()

            a3 = Answer(
                content="STM32H7 uses data caching (D-Cache). If the CPU reads buffer data while the DMA controller updates it in SRAM, the cache becomes incoherent. Place your buffer in D2 domain (SRAM3) using `__attribute__((section(\".sdram\")))` or similar, configure the MPU as non-cacheable/buffered, and ensure your buffer size is a multiple of the 32-byte cache line size. This guarantees DMA transfers align with cache operations.",
                question_id=q3.id,
                author_id=user_map["firmware_guru"].id,
                is_accepted=True,
                score=15
            )
            db.add(a3)
            await db.flush()

            f3 = FeaturedSolution()
            f3.question_id = q3.id
            f3.display_order = 3
            db.add(f3)

        # 4. FreeRTOS Stack Overflow
        q4_check = await db.execute(select(Question).where(Question.title == "FreeRTOS Stack Overflow during heavy Interrupt nesting"))
        if not q4_check.scalar_one_or_none():
            q4 = Question(
                title="FreeRTOS Stack Overflow during heavy Interrupt nesting",
                slug="freertos-stack-overflow-during-heavy-interrupt-nesting",
                content="I have high frequency timer interrupts nested on an ARM Cortex-M4 core running FreeRTOS. I have set configCHECK_FOR_STACK_OVERFLOW to 2, and the hook gets called. However, all my tasks are configured with plenty of stack space. Why is this stack overflow occurring?",
                author_id=user_map["rtos_dev"].id,
                score=4,
                views=85,
                is_solved=False,
                created_at=datetime.utcnow()
            )
            q4.tags = [tag_map["freertos"], tag_map["rtos"], tag_map["bare-metal"]]
            db.add(q4)
            await db.flush()

            a4 = Answer(
                content="Interrupt service routines (ISRs) on ARM Cortex-M do not use the task stack; they run on the Main Stack Pointer (MSP), while tasks run on the Process Stack Pointer (PSP). If you have heavy interrupt nesting, MSP overflows into task space or system variables. Increase the size of the stack allocated to MSP (defined in your linker script or startup.s as Stack_Size).",
                question_id=q4.id,
                author_id=user_map["firmware_guru"].id,
                is_accepted=False,
                score=5
            )
            db.add(a4)

        # 5. STM32 HAL I2C Timeout blocking entire scheduler loop
        q5_check = await db.execute(select(Question).where(Question.title == "STM32 HAL I2C Timeout blocking entire scheduler loop"))
        if not q5_check.scalar_one_or_none():
            q5 = Question(
                title="STM32 HAL I2C Timeout blocking entire scheduler loop",
                slug="stm32-hal-i2c-timeout-blocking-entire-scheduler-loop",
                content="I'm using `HAL_I2C_Master_Transmit` in a medium priority task. When the I2C bus hangs due to electrical noise, the entire task blocks for 1000ms. Since it's a synchronous HAL call, it starves low priority tasks. Is there a non-blocking way to handle this?",
                author_id=user_map["firmware_guru"].id,
                score=6,
                views=97,
                is_solved=False,
                created_at=datetime.utcnow()
            )
            q5.tags = [tag_map["stm32"], tag_map["i2c"], tag_map["freertos"]]
            db.add(q5)
            await db.flush()

            a5 = Answer(
                content="Switch to `HAL_I2C_Master_Transmit_IT` or `HAL_I2C_Master_Transmit_DMA`. Use FreeRTOS binary semaphores to block the calling task until the transfer complete callback (`HAL_I2C_MemTxCpltCallback`) is fired, returning execution back to the task without busy-waiting. This keeps other threads running during I2C transfers.",
                question_id=q5.id,
                author_id=user_map["rtos_dev"].id,
                is_accepted=False,
                score=4
            )
            db.add(a5)

        # 6. Bare-metal Startup Code hanging before main()
        q6_check = await db.execute(select(Question).where(Question.title == "Bare-metal Startup Code hanging before main()"))
        if not q6_check.scalar_one_or_none():
            q6 = Question(
                title="Bare-metal Startup Code hanging before main()",
                slug="bare-metal-startup-code-hanging-before-main",
                content="I am writing custom bare-metal startup code for an STM32F103. After copying the data segment from Flash to SRAM and filling BSS with zero, the code jumps to main but hangs immediately. When debugging with GDB, I see the PC points to a memory offset outside of flash. What am I doing wrong?",
                author_id=user_map["hardware_hacker"].id,
                score=3,
                views=64,
                is_solved=False,
                created_at=datetime.utcnow()
            )
            q6.tags = [tag_map["bare-metal"], tag_map["stm32"]]
            db.add(q6)
            await db.flush()

            a6 = Answer(
                content="Check your reset vector value. Cortex-M vectors expect the LSB (least significant bit) of the function address to be 1 to indicate Thumb state. If your startup code reset vector does not have the Thumb bit set (e.g. your function label in assembly lacks `.thumb_func` declaration), the CPU attempts to run in ARM state, triggers a usage fault immediately, and branches to an invalid PC address.",
                question_id=q6.id,
                author_id=user_map["rtos_dev"].id,
                is_accepted=False,
                score=3
            )
            db.add(a6)

        await db.commit()
        print("Database seeded successfully with all initial questions, answers, and featured solutions!")

if __name__ == "__main__":
    asyncio.run(seed())
