
if [ -f /etc/.bash-preexec ]; then
  . /etc/.bash-preexec
  [[ -f /etc/.hooks ]] && . /etc/.hooks && export HOOKS_LOADED=1
fi
