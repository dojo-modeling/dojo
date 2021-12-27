
PATH="$HOME/.local/bin:$PATH"

if [ -f ~/.bash-preexec ]; then
  . ~/.bash-preexec
  [[ -f ~/.hooks ]] && . ~/.hooks && export HOOKS_LOADED=1
fi
