cd /home/rmsurveyai/htdocs/rmsurveyai.com
rm -rf public/storage
git fetch --all
git checkout main
git pull --ff-only origin main



cd /home/rmsurveyai/htdocs/rmsurveyai.com && bash scripts/deploy-live.sh