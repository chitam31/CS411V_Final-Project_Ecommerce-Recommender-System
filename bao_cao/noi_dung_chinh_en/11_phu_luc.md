# @A Declaration of AI use {#sec:ai}

The full declaration is in `docs/AI_USAGE.md` (section A.9 of the outline).

**Tool, period, scope.** The team used Claude (Anthropic), through claude.ai Projects and Claude Code, from 9 to 16 November 2026. AI generated almost all of:

- the source code, configuration and tests;
- the documentation, reports, slides and defence scripts.

Commits created by AI have the author `Claude` or a `Co-Authored-By: Claude` line.

**Work done by the team.**

- Provided the course outline and the team's earlier cluster code and configuration.
- Set up ZeroTier and operated the 6 lab machines.
- Downloaded the data with the Kaggle key on a laptop.
- Ran every job, stream and DAG on the cluster; sent error logs for AI to fix.
- Made the deployment decisions.
- Verified the results, took screenshots, defends the project.

Every figure in this report comes from real runs on the cluster. The list of requests sent to the AI (verbatim or summarised, marked as such) is in `docs/AI_USAGE.md` section 3.

# @B Rebuilding the system {#sec:dung-lai}

Per-machine details are in `docs/TRIEN_KHAI_CUM.md`; the mapping of the repository layout to section A.5 is in `README.md` section 2.1.

```
# laptop (Git Bash): SSH to the 6 machines, push code, start services by each machine's role
bash scripts/cum/ssh_tat_ca.sh --tao-config > ~/.ssh/config && bash scripts/cum/ssh_tat_ca.sh --chep-khoa
bash scripts/cum/ssh_tat_ca.sh --dong-bo-ma
bash scripts/cum/ssh_tat_ca.sh "cd ~/bd03_khuyen_nghi && bash scripts/cum/khoi_dong_may.sh"
bash scripts/cum/chep_du_lieu.sh                 # download RetailRocket with the laptop's Kaggle key
# master: CSV to HDFS, then the whole pipeline in DAG 1 order
bash scripts/tai_du_lieu.sh && bash scripts/chay_lan_dau.sh
bash scripts/luong.sh khoi_dong tat_ca           # 3 streaming jobs
# labsit: create topics, replay events
bash scripts/tao_topic.sh && python3 producer/phat_lai_su_kien.py --tep ~/du_lieu/retailrocket/events.csv
# check and collect evidence
bash scripts/cum/kiem_tra_cum.sh && bash scripts/thu_bang_chung.sh
```

Tests: `pytest` (143 tests, including 8 DAG tests that need `requirements-airflow.txt`).
