" Open log file.
function ollama#open_log(...)
  call denops#notify("ollama", "openLog", a:000)
endfunction

" Start chat with Ollama.
function ollama#start_chat(...)
  call denops#notify("ollama", "startChat", a:000)
endfunction

" Start chat with Ollama within context.
function ollama#start_chat_with_context(...)
  call denops#notify("ollama", "startChatWithContext", a:000)
endfunction

	
" Get completion for the current buffer around the cursor.
function ollama#complete(...)
  let l:Cb = a:2
  if type(l:Cb) == v:t_func
    let l:Cb = denops#callback#register(l:Cb)
  elseif type(l:Cb) == v:t_string
    let l:Cb = denops#callback#register(function(l:Cb))
  endif
  call denops#notify("ollama", "complete", [a:1, l:Cb] + a:000[2:])
endfunction

" Show list models in local.
function ollama#list_models(...)
  call denops#notify("ollama", "listModels", a:000)
endfunction

" Pull a model from the library.
function ollama#pull_model(...)
  call denops#notify("ollama", "pullModel", a:000)
endfunction

" Delete a model in local.
function ollama#delete_model(...)
  call denops#notify("ollama", "deleteModel", a:000)
endfunction
